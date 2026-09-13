import { createSky, HOME, angularDistance, clamp } from './sky.js';
import { startHands } from './hands.js';
import { TARGETS, lightStory } from './targets.js';
import { lookup } from './lookup.js';

const $ = (id) => document.getElementById(id);

const DWELL_MS = 1100;      // point & hold this long to "click"
const FIST_MS = 900;        // hold a fist this long to go home
const DRAG_GAIN = 1.6;      // hand movement → sky movement
const INERTIA_DECAY = 0.9;
const SPREAD_ZOOM_GAIN = 2.5;   // fingers 3× wider → view ~15× closer
const SPREAD_DEADZONE = 0.006;  // log-change in spread below this is tremor
const LOOKUP_STILL_MS = 650;

const sky = await createSky($('sky'));
sky.onWarp = (w) => {
  const el = $('warp');
  el.style.opacity = w.toFixed(3);
  el.style.setProperty('--w', w.toFixed(3));
};

// ---------------------------------------------------------------------------
// Target markers + tour strip
// ---------------------------------------------------------------------------
const markers = TARGETS.map((t) => {
  const el = document.createElement('button');
  el.className = 'marker';
  el.dataset.dwell = t.id;
  el.innerHTML = `<span class="marker-ring"></span><span class="marker-label"></span>`;
  el.querySelector('.marker-label').textContent = t.name;
  el.addEventListener('click', () => visit(t));
  $('markers').appendChild(el);
  return { t, el };
});

const tourButtons = new Map();
{
  const home = document.createElement('button');
  home.className = 'tour-item home';
  home.textContent = '↺ Whole sky';
  home.dataset.dwell = 'home';
  home.addEventListener('click', goHome);
  $('tour').appendChild(home);
  for (const t of TARGETS) {
    const b = document.createElement('button');
    b.className = 'tour-item';
    b.textContent = t.name;
    b.dataset.dwell = t.id;
    b.addEventListener('click', () => visit(t));
    $('tour').appendChild(b);
    tourButtons.set(t.id, b);
  }
}

function visit(t) {
  hideWhatsHere();
  sky.flyTo(t);
}

function goHome() {
  hideWhatsHere();
  sky.flyTo(HOME);
}

function activate(id) {
  if (id === 'home') return goHome();
  const t = TARGETS.find((x) => x.id === id);
  if (t) visit(t);
}

// ---------------------------------------------------------------------------
// Per-frame view updates: markers, "you are here" card, scale
// ---------------------------------------------------------------------------
let currentTarget = null;

function updateView() {
  sky.syncHubble();
  const fov = sky.fov;
  const { w, h } = sky.size;
  const c = sky.center;

  for (const { t, el } of markers) {
    // Show a marker while it's a small point of interest, hide it once you're inside it.
    const visible = fov > t.fov * 2.5 && fov < 100;
    const p = visible ? sky.toScreen(t.ra, t.dec) : null;
    if (p && p.x > -50 && p.y > -50 && p.x < w + 50 && p.y < h + 50) {
      el.style.transform = `translate(${p.x}px, ${p.y}px) translate(-11px, -50%)`;
      el.style.opacity = '1';
      el.style.pointerEvents = 'auto';
    } else {
      el.style.opacity = '0';
      el.style.pointerEvents = 'none';
    }
  }

  // The most specific target you're currently looking at.
  const here = TARGETS
    .filter((t) => fov < t.fov * 3.5 && fov > t.fov * 0.02
      && angularDistance(c.ra, c.dec, t.ra, t.dec) < Math.max(t.fov * 0.5, fov * 0.35))
    .sort((a, b) => a.fov - b.fov)[0] ?? null;

  if (here !== currentTarget) {
    currentTarget = here;
    showInfo(here);
    for (const [id, b] of tourButtons) b.classList.toggle('is-active', id === here?.id);
  }

  $('scale').textContent = describeFov(fov);
}

function showInfo(t) {
  const card = $('info');
  if (!t) { card.hidden = true; return; }
  $('info-name').textContent = t.name;
  $('info-kind').textContent = t.kind;
  $('info-fact').textContent = t.fact;
  $('info-light').textContent = lightStory(t);
  card.hidden = true;
  void card.offsetWidth; // restart the entrance animation
  card.hidden = false;
}

function describeFov(fov) {
  const moons = fov / 0.52; // the full Moon is about half a degree across
  if (fov >= 20) return `Viewing ${Math.round(fov)}° of sky`;
  if (moons >= 1.5) return `View is ${Math.round(moons)} full Moons wide`;
  if (moons >= 0.1) return `View is ${moons.toFixed(1)}× the width of the full Moon`;
  // A 2.4 cm coin spans θ arcseconds at a distance of 0.024 × 206265 / θ metres.
  const arcsec = fov * 3600;
  const metres = 0.024 * 206265 / arcsec;
  const away = metres >= 1000 ? `${(metres / 1000).toFixed(1)} km` : `${Math.round(metres / 10) * 10} m`;
  return `View is ${Math.round(arcsec)}″ wide — a coin seen from ${away} away`;
}

// ---------------------------------------------------------------------------
// "What is here?" — ask SIMBAD about the spot you're pointing at
// ---------------------------------------------------------------------------
const whatsHere = $('whats-here');
let lookupAnchor = null;
let lookupSeq = 0;

async function askWhatsHere(x, y) {
  const pos = sky.toSky(x, y);
  if (!pos) return;
  const seq = ++lookupSeq;
  lookupAnchor = { x, y };
  try {
    const found = await lookup(pos.ra, pos.dec, sky.fov * 0.025);
    if (seq !== lookupSeq) return;
    if (!found) {
      renderWhatsHere(x, y, `<span class="muted">Nothing catalogued exactly here — just stars, dust and distance.</span>`);
      return;
    }
    renderWhatsHere(x, y,
      `<b>${escapeHtml(found.name)}</b><span>${escapeHtml(found.type)}</span>` +
      (found.also ? `<span class="muted"> · ${escapeHtml(found.also)}</span>` : '') +
      (found.distance ? `<br><span class="muted">${escapeHtml(found.distance)}</span>` : ''));
  } catch (err) {
    if (err.name !== 'AbortError' && seq === lookupSeq) hideWhatsHere();
  }
}

function renderWhatsHere(x, y, html) {
  whatsHere.innerHTML = html;
  whatsHere.style.left = `${Math.min(x, window.innerWidth - 300)}px`;
  whatsHere.style.top = `${Math.min(y, window.innerHeight - 140)}px`;
  whatsHere.hidden = false;
}

function hideWhatsHere() {
  lookupSeq++;
  lookupAnchor = null;
  whatsHere.hidden = true;
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

// Mouse: pause over the sky to ask what's there.
{
  let timer = null;
  let down = false;
  const skyEl = $('sky');
  skyEl.addEventListener('pointerdown', () => { down = true; sky.cancelFlight(); hideWhatsHere(); });
  window.addEventListener('pointerup', () => { down = false; });
  skyEl.addEventListener('wheel', () => { sky.cancelFlight(); hideWhatsHere(); }, { passive: true });
  skyEl.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' || hand.latest.length) return;
    if (lookupAnchor && Math.hypot(e.clientX - lookupAnchor.x, e.clientY - lookupAnchor.y) > 30) hideWhatsHere();
    clearTimeout(timer);
    if (down) return;
    timer = setTimeout(() => askWhatsHere(e.clientX, e.clientY), LOOKUP_STILL_MS);
  });
  skyEl.addEventListener('pointerleave', () => clearTimeout(timer));
}

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' || e.key === 'Home') goHome();
});

// ---------------------------------------------------------------------------
// Hands
// ---------------------------------------------------------------------------
let handsOn = false;
const cursorEls = new Map();
const hand = {
  latest: [],
  prevPinch: new Map(),   // key → last pinch point (px) while pinching
  prevSpread: null,       // two-hand pinch distance
  prevMid: null,
  prevZoom: new Map(),    // key → last thumb–index spread while in the zoom pose
  velocity: { x: 0, y: 0 },
  dwell: new Map(),       // key → { id, since }
  still: new Map(),       // key → { x, y, since, asked }
  fistSince: null,
};

function ensureCursor(key) {
  let el = cursorEls.get(key);
  if (!el) {
    el = document.createElement('div');
    el.className = 'hand-cursor';
    el.innerHTML = `<svg viewBox="0 0 48 48"><circle class="track" cx="24" cy="24" r="20"/><circle class="progress" cx="24" cy="24" r="20" stroke-dasharray="0 126"/></svg><div class="core"></div>`;
    $('cursors').appendChild(el);
    cursorEls.set(key, el);
  }
  return el;
}

function setProgress(el, p) {
  el.querySelector('.progress').setAttribute('stroke-dasharray', `${(clamp(p, 0, 1) * 125.7).toFixed(1)} 126`);
}

function applyHands(now) {
  const hands = hand.latest;
  const { w, h } = sky.size;
  const px = (pt) => ({ x: pt.x * w, y: pt.y * h });

  // Cursors
  const keys = new Set(hands.map((hd) => hd.key));
  for (const [key, el] of cursorEls) {
    if (!keys.has(key)) { el.remove(); cursorEls.delete(key); hand.dwell.delete(key); hand.still.delete(key); }
  }

  const pinching = hands.filter((hd) => hd.pinching);

  // --- Two hands pinching: stretch to zoom, move together to pan
  if (pinching.length >= 2) {
    const a = px(pinching[0].pinchPoint), b = px(pinching[1].pinchPoint);
    const spread = Math.hypot(a.x - b.x, a.y - b.y);
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    if (hand.prevSpread && spread > 20) {
      sky.cancelFlight();
      sky.panByPixels(mid.x - hand.prevMid.x, mid.y - hand.prevMid.y);
      sky.zoomAt(Math.pow(hand.prevSpread / spread, 1.5), mid.x, mid.y);
    }
    hand.prevSpread = spread;
    hand.prevMid = mid;
    hand.prevPinch.clear();
    hand.velocity = { x: 0, y: 0 };
  } else {
    hand.prevSpread = null;
    hand.prevMid = null;
  }

  // --- One hand pinching: grab and drag the sky
  if (pinching.length === 1) {
    const hd = pinching[0];
    const p = px(hd.pinchPoint);
    const prev = hand.prevPinch.get(hd.key);
    if (prev) {
      const dx = (p.x - prev.x) * DRAG_GAIN, dy = (p.y - prev.y) * DRAG_GAIN;
      sky.cancelFlight();
      sky.panByPixels(dx, dy);
      hand.velocity = { x: hand.velocity.x * 0.5 + dx * 0.5, y: hand.velocity.y * 0.5 + dy * 0.5 };
      hideWhatsHere();
    }
    hand.prevPinch.clear();
    hand.prevPinch.set(hd.key, p);
  } else if (pinching.length === 0) {
    hand.prevPinch.clear();
    // Let go: the sky keeps drifting and slows down.
    if (Math.hypot(hand.velocity.x, hand.velocity.y) > 0.3 && !sky.flying) {
      sky.panByPixels(hand.velocity.x, hand.velocity.y);
      hand.velocity.x *= INERTIA_DECAY;
      hand.velocity.y *= INERTIA_DECAY;
    } else {
      hand.velocity = { x: 0, y: 0 };
    }
  }

  // --- One hand, thumb & index spread: open wider to zoom in, close to zoom out.
  // Anchored between the two fingertips so what's between them grows. The baseline
  // resets whenever the pose starts, so entering the pose never causes a jump.
  for (const hd of hands) {
    const prev = hand.prevZoom.get(hd.key);
    if (!hd.zoomPose || pinching.length >= 2) {
      hand.prevZoom.delete(hd.key);
      continue;
    }
    if (prev === undefined) {
      hand.prevZoom.set(hd.key, hd.spread);
      continue;
    }
    const change = Math.log(hd.spread / prev);
    if (Math.abs(change) < SPREAD_DEADZONE) continue; // ignore finger tremor
    const anchor = px(hd.pinchPoint);
    sky.cancelFlight();
    sky.zoomAt(Math.exp(-change * SPREAD_ZOOM_GAIN), anchor.x, anchor.y);
    hand.prevZoom.set(hd.key, hd.spread);
    hand.velocity = { x: 0, y: 0 };
    hideWhatsHere();
  }

  // --- Fist: hold to go home
  const fist = hands.find((hd) => hd.fist);
  if (fist) {
    hand.fistSince ??= now;
    if (now - hand.fistSince > FIST_MS) {
      hand.fistSince = Infinity; // fire once per fist
      goHome();
    }
  } else {
    hand.fistSince = null;
  }

  // --- Per-hand cursor, dwell-to-select, hold-still-to-ask
  for (const hd of hands) {
    const el = ensureCursor(hd.key);
    const c = px(hd.pinching || hd.zoomPose ? hd.pinchPoint : hd.cursor);
    el.style.transform = `translate(${c.x}px, ${c.y}px)`;
    el.classList.toggle('is-pinching', hd.pinching);
    el.classList.toggle('is-zooming', hd.zoomPose);
    el.classList.toggle('is-fist', hd.fist);

    let progress = 0;
    if (hd.fist && Number.isFinite(hand.fistSince)) {
      progress = (now - hand.fistSince) / FIST_MS;
    } else if (!hd.pinching && !hd.fist && !hd.zoomPose) {
      // Dwell on anything selectable under the fingertip
      const under = document.elementsFromPoint(c.x, c.y).find((n) => n.dataset?.dwell && n.style.opacity !== '0');
      const d = hand.dwell.get(hd.key);
      document.querySelectorAll('.is-dwelling').forEach((n) => n !== under && n.classList.remove('is-dwelling'));
      if (under) {
        under.classList.add('is-dwelling');
        if (!d || d.id !== under.dataset.dwell) {
          hand.dwell.set(hd.key, { id: under.dataset.dwell, since: now });
        } else {
          progress = (now - d.since) / DWELL_MS;
          if (progress >= 1) {
            hand.dwell.set(hd.key, { id: under.dataset.dwell, since: Infinity });
            activate(under.dataset.dwell);
          }
        }
      } else {
        hand.dwell.delete(hd.key);
        // Holding still over open sky asks "what is this?"
        const s = hand.still.get(hd.key);
        if (!s || Math.hypot(c.x - s.x, c.y - s.y) > 18) {
          hand.still.set(hd.key, { x: c.x, y: c.y, since: now, asked: false });
          if (lookupAnchor && Math.hypot(c.x - lookupAnchor.x, c.y - lookupAnchor.y) > 40) hideWhatsHere();
        } else if (!s.asked && now - s.since > LOOKUP_STILL_MS && !sky.flying) {
          s.asked = true;
          askWhatsHere(c.x, c.y);
        }
      }
    }
    setProgress(el, progress);
  }
}

async function enableHands() {
  $('camera').hidden = false;
  try {
    await startHands($('video'), (hands) => { hand.latest = hands; });
    handsOn = true;
    $('legend').hidden = false;
  } catch (err) {
    console.error(err);
    $('camera-status').textContent = 'Camera unavailable — use your mouse';
  }
}

// ---------------------------------------------------------------------------
// Main loop + intro
// ---------------------------------------------------------------------------
function frame(now) {
  applyHands(now);
  if (handsOn) $('camera-status').textContent = hand.latest.length ? describeHands(hand.latest) : 'Raise a hand';
  // While a hand is in view the glowing hand cursor is the pointer; hide the mouse's.
  document.body.classList.toggle('hands-active', hand.latest.length > 0);
  updateView();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

function describeHands(hands) {
  if (hands.some((hd) => hd.fist)) return 'Fist — going home…';
  const n = hands.filter((hd) => hd.pinching).length;
  if (n >= 2) return 'Stretching space';
  if (n === 1) return 'Holding the sky';
  if (hands.some((hd) => hd.zoomPose)) return 'Spread to zoom in, close to zoom out';
  return 'Pinch to grab · spread thumb & index to zoom';
}

function closeIntro() {
  $('intro').classList.add('is-gone');
}

$('start-hands').addEventListener('click', () => { closeIntro(); enableHands(); });
$('start-mouse').addEventListener('click', closeIntro);
