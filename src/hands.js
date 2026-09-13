import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

const WASM = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm';
const MODEL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

// Landmark indices (MediaPipe hand model)
const WRIST = 0, THUMB_TIP = 4, INDEX_MCP = 5, INDEX_TIP = 8, MIDDLE_MCP = 9;
const FINGERS = [[8, 5], [12, 9], [16, 13], [20, 17]]; // [tip, knuckle]

// Pinch uses hysteresis so it doesn't flicker at the threshold.
const PINCH_ON = 0.32;
const PINCH_OFF = 0.48;

// Frames a pose must hold before it switches, so a passing hand shape doesn't trigger it.
const ZOOM_POSE_FRAMES = 3;

// Starts the webcam and calls onHands(hands) every video frame.
// Each hand: { key, cursor:{x,y}, pinchPoint:{x,y}, pinching, fist, zoomPose, spread },
// coordinates in 0..1 screen space, mirrored so moving your hand right moves right on screen.
// `zoomPose` is thumb and index out with the other three fingers curled; `spread` is the
// thumb–index gap relative to hand size, which the app turns into zoom.
export async function startHands(video, onHands) {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
    audio: false,
  });
  video.srcObject = stream;
  await video.play();

  const vision = await FilesetResolver.forVisionTasks(WASM);
  const landmarker = await HandLandmarker.createFromOptions(vision, {
    baseOptions: { modelAssetPath: MODEL, delegate: 'GPU' },
    runningMode: 'VIDEO',
    numHands: 2,
    minHandDetectionConfidence: 0.6,
    minHandPresenceConfidence: 0.6,
    minTrackingConfidence: 0.5,
  });

  const trackers = new Map();
  let lastVideoTime = -1;

  const loop = () => {
    if (video.readyState >= 2 && video.currentTime !== lastVideoTime) {
      lastVideoTime = video.currentTime;
      const now = performance.now();
      const result = landmarker.detectForVideo(video, now);
      const aspect = video.videoWidth / video.videoHeight || 16 / 9;
      const seen = new Set();

      const hands = result.landmarks.map((lm, i) => {
        const key = result.handedness[i]?.[0]?.categoryName ?? `hand${i}`;
        seen.add(key);
        let tr = trackers.get(key);
        if (!tr) {
          tr = new HandTracker(key);
          trackers.set(key, tr);
        }
        return tr.update(lm, aspect, now);
      });

      for (const key of trackers.keys()) if (!seen.has(key)) trackers.delete(key);
      onHands(hands);
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);

  return () => stream.getTracks().forEach((t) => t.stop());
}

export class HandTracker {
  constructor(key) {
    this.key = key;
    this.pinching = false;
    this.zoomPose = false;
    this.poseStreak = 0;
    this.cursorFilter = new PointFilter();
    this.pinchFilter = new PointFilter();
    this.spreadFilter = new OneEuro(0.8, 0.01);
  }

  update(lm, aspect, now) {
    // Work in an aspect-correct space so distances mean the same in x and y.
    const p = (i) => ({ x: lm[i].x * aspect, y: lm[i].y });
    const handSize = dist(p(WRIST), p(MIDDLE_MCP)) || 1e-6;

    const pinchRatio = dist(p(THUMB_TIP), p(INDEX_TIP)) / handSize;
    this.pinching = this.pinching ? pinchRatio < PINCH_OFF : pinchRatio < PINCH_ON;

    // A fist is every finger curled into the palm *without* thumb and index touching,
    // so a pinch made with the other fingers tucked in still counts as a pinch.
    const wrist = p(WRIST);
    const allCurled = FINGERS.every(([tip, knuckle]) => dist(p(tip), wrist) < dist(p(knuckle), wrist) * 1.0);
    const fist = allCurled && pinchRatio > PINCH_ON;

    // Zoom pose: index stretched out, middle/ring/little tucked in, thumb and index apart.
    const [index, ...others] = FINGERS;
    const indexOut = dist(p(index[0]), wrist) > dist(p(index[1]), wrist) * 1.35;
    const othersCurled = others.every(([tip, knuckle]) => dist(p(tip), wrist) < dist(p(knuckle), wrist) * 1.1);
    const wantsZoom = indexOut && othersCurled && !this.pinching && !fist;
    if (wantsZoom !== this.zoomPose) {
      if (++this.poseStreak >= ZOOM_POSE_FRAMES) { this.zoomPose = wantsZoom; this.poseStreak = 0; }
    } else {
      this.poseStreak = 0;
    }
    // Only smooth while zooming: carrying smoothed history in from a pinch would make the
    // value keep drifting up after the pose starts, zooming in on its own.
    const spread = this.zoomPose ? this.spreadFilter.filter(pinchRatio, now) : this.spreadFilter.reset(pinchRatio, now);

    const mirror = (pt) => ({ x: 1 - pt.x, y: pt.y });
    const indexTip = mirror(lm[INDEX_TIP]);
    const pinchMid = mirror({ x: (lm[THUMB_TIP].x + lm[INDEX_TIP].x) / 2, y: (lm[THUMB_TIP].y + lm[INDEX_TIP].y) / 2 });

    return {
      key: this.key,
      cursor: this.cursorFilter.filter(indexTip, now),
      pinchPoint: this.pinchFilter.filter(pinchMid, now),
      pinching: this.pinching && !fist,
      fist,
      zoomPose: this.zoomPose && !this.pinching && !fist,
      spread,
      knuckle: mirror(lm[INDEX_MCP]),
    };
  }
}

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// One Euro filter: smooth when the hand is still, responsive when it moves fast.
class OneEuro {
  constructor(minCutoff = 1.2, beta = 0.02, dCutoff = 1.0) {
    this.minCutoff = minCutoff; this.beta = beta; this.dCutoff = dCutoff;
    this.x = null; this.dx = 0; this.t = null;
  }
  reset(value, tMs) {
    this.x = value; this.dx = 0; this.t = tMs;
    return value;
  }
  filter(value, tMs) {
    if (this.t === null) { this.t = tMs; this.x = value; return value; }
    const dt = Math.max((tMs - this.t) / 1000, 1e-3);
    this.t = tMs;
    const alpha = (cutoff) => 1 / (1 + 1 / (2 * Math.PI * cutoff * dt));
    const rawDx = (value - this.x) / dt;
    const aD = alpha(this.dCutoff);
    this.dx = aD * rawDx + (1 - aD) * this.dx;
    const a = alpha(this.minCutoff + this.beta * Math.abs(this.dx) * 100);
    this.x = a * value + (1 - a) * this.x;
    return this.x;
  }
}

class PointFilter {
  constructor() { this.fx = new OneEuro(); this.fy = new OneEuro(); }
  filter(pt, t) { return { x: this.fx.filter(pt.x, t), y: this.fy.filter(pt.y, t) }; }
}
