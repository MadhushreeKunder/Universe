import A from 'aladin-lite';

// Real imagery, layered bottom to top:
//   DSS2    – the whole sky, from the Digitized Sky Survey photographic plates
//   Hubble  – NASA/ESA Hubble outreach images, pinned to their true positions
// (Stacking Gaia DR3's all-sky map between the two breaks Aladin's rendering, so it's left out.)
const DSS = 'CDS/P/DSS2/color';
const HUBBLE = 'CDS/P/HST/EPO';

export const MIN_FOV = 0.002; // ~7 arcsec, deep into Hubble pixels
export const MAX_FOV = 180;
export const HOME = { ra: 266.4, dec: -28.9, fov: 140 }; // towards the galactic centre

// Hubble layer fades in between these fields of view (degrees).
// The widest targets (Orion, Carina, Tarantula) frame at 0.35–0.4°, so they arrive fully shown.
const HUBBLE_HIDDEN_FOV = 1.2;
const HUBBLE_FULL_FOV = 0.45;

export async function createSky(el) {
  await A.init;

  const aladin = A.aladin(el, {
    survey: DSS,
    projection: 'SIN',
    cooFrame: 'ICRS',
    fov: HOME.fov,
    target: `${HOME.ra} ${HOME.dec}`,
    backgroundColor: 'rgb(0, 0, 0)',
    showReticle: false,
    showZoomControl: false,
    showFullscreenControl: false,
    showLayersControl: false,
    showGotoControl: false,
    showProjectionControl: false,
    showFrame: false,
    showFov: false,
    showCooLocation: false,
    showStatusBar: false,
    showContextMenu: false,
    inertia: true,
  });

  const hubble = aladin.newImageSurvey(HUBBLE);
  aladin.setOverlayImageLayer(hubble, 'hubble');

  const sky = new Sky(aladin, el, hubble);
  sky.gotoView(HOME);
  return sky;
}

class Sky {
  constructor(aladin, el, hubble) {
    this.aladin = aladin;
    this.el = el;
    this.hubble = hubble;
    this.hubbleOpacity = null;
    this.flight = null;
  }

  // Zoomed out, each Hubble tile averages a small photo with a lot of empty sky and
  // renders as a dark block over the survey. Keep the layer hidden until the photos
  // are big enough on screen to look like photos, then fade them in.
  syncHubble() {
    const opacity = 1 - smoothstep(Math.log(HUBBLE_FULL_FOV), Math.log(HUBBLE_HIDDEN_FOV), Math.log(this.fov));
    if (this.hubbleOpacity !== null && Math.abs(opacity - this.hubbleOpacity) < 0.01) return;
    this.hubbleOpacity = opacity;
    this.hubble.setOpacity(opacity);
  }

  get fov() {
    return Math.max(...this.aladin.getFov());
  }

  get center() {
    const [ra, dec] = this.aladin.getRaDec();
    return { ra, dec };
  }

  get size() {
    return { w: this.el.clientWidth, h: this.el.clientHeight };
  }

  gotoView({ ra, dec, fov }) {
    this.aladin.gotoRaDec(ra, dec);
    if (fov) this.aladin.setFoV(clamp(fov, MIN_FOV, MAX_FOV));
  }

  toScreen(ra, dec) {
    const p = this.aladin.world2pix(ra, dec);
    return p ? { x: p[0], y: p[1] } : null;
  }

  toSky(x, y) {
    const p = this.aladin.pix2world(x, y);
    return p ? { ra: p[0], dec: p[1] } : null;
  }

  // Drag the sky so the point under the hand follows the hand.
  panByPixels(dx, dy) {
    const { w, h } = this.size;
    const next = this.toSky(w / 2 - dx, h / 2 - dy);
    if (next) this.aladin.gotoRaDec(next.ra, next.dec);
  }

  // Zoom keeping the sky point under (x, y) fixed on screen, like pinch-to-zoom on a photo.
  zoomAt(factor, x, y) {
    const before = this.toSky(x, y);
    this.aladin.setFoV(clamp(this.fov * factor, MIN_FOV, MAX_FOV));
    if (before) {
      const after = this.toScreen(before.ra, before.dec);
      if (after) this.panByPixels(x - after.x, y - after.y);
    }
  }

  // Every intermediate view in a flight makes Aladin queue tile downloads, and the tile
  // servers are slow enough that a long continuous zoom leaves the destination waiting
  // behind stale tiles. So: nearby targets get one continuous "powers of ten" flight;
  // far ones rise out, warp (a brief flash that hides a jump), then dive only the last
  // few zoom levels into the target.
  flyTo({ ra, dec, fov }, onArrive) {
    this.cancelFlight();
    const fov0 = this.fov;
    const from = toVec(this.center.ra, this.center.dec);
    const to = toVec(ra, dec);
    const arc = angleBetween(from, to) * 180 / Math.PI;
    const peak = clamp(Math.max(fov0, fov, arc * 1.8), MIN_FOV, 120);
    const diveFrom = Math.min(peak, fov * 16);

    const segments = peak <= diveFrom * 1.01
      ? [{ ms: clamp(1200 + Math.log10(peak / fov0 * peak / fov) * 600, 1400, 4000), run: (t) => {
          const f = t < 0.5
            ? Math.exp(lerp(Math.log(fov0), Math.log(peak), ease(t * 2)))
            : Math.exp(lerp(Math.log(peak), Math.log(fov), ease((t - 0.5) * 2)));
          return { pos: fromVec(slerp(from, to, smoothstep(0.2, 0.8, t))), fov: f };
        } }]
      : [
          // Rise out, drifting a little towards the target.
          { ms: clamp(700 + Math.log10(peak / fov0) * 450, 700, 1800), run: (t) => ({
            pos: fromVec(slerp(from, to, ease(t) * 0.15)),
            fov: Math.exp(lerp(Math.log(fov0), Math.log(peak), ease(t))),
            warp: smoothstep(0.55, 1, t),
          }) },
          // Warp: the jump happens at the brightest moment.
          { ms: 450, run: (t) => ({
            pos: t < 0.5 ? fromVec(slerp(from, to, 0.15)) : { ra, dec },
            fov: t < 0.5 ? peak : diveFrom,
            warp: 1 - smoothstep(0.5, 1, t),
          }) },
          // Dive in.
          { ms: 2200, run: (t) => ({
            pos: { ra, dec },
            fov: Math.exp(lerp(Math.log(diveFrom), Math.log(fov), 1 - Math.pow(1 - t, 3))),
            warp: 0,
          }) },
        ];

    let index = 0;
    let segStart = performance.now();
    const step = (now) => {
      const seg = segments[index];
      const t = clamp((now - segStart) / seg.ms, 0, 1);
      const v = seg.run(t);
      this.aladin.gotoRaDec(v.pos.ra, v.pos.dec);
      this.aladin.setFoV(v.fov);
      this.onWarp?.(v.warp ?? 0);
      if (t >= 1) {
        index++;
        segStart = now;
      }
      if (index < segments.length) {
        this.flight = requestAnimationFrame(step);
      } else {
        this.flight = null;
        this.onWarp?.(0);
        onArrive?.();
      }
    };
    this.flight = requestAnimationFrame(step);
  }

  get flying() {
    return this.flight !== null;
  }

  cancelFlight() {
    if (this.flight !== null) cancelAnimationFrame(this.flight);
    this.flight = null;
    this.onWarp?.(0);
  }
}

// ---- math helpers ----
export function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }
function lerp(a, b, t) { return a + (b - a) * t; }
function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
function smoothstep(a, b, x) { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }

function toVec(ra, dec) {
  const r = ra * Math.PI / 180, d = dec * Math.PI / 180;
  return [Math.cos(d) * Math.cos(r), Math.cos(d) * Math.sin(r), Math.sin(d)];
}
function fromVec([x, y, z]) {
  const ra = Math.atan2(y, x) * 180 / Math.PI;
  return { ra: (ra + 360) % 360, dec: Math.asin(clamp(z, -1, 1)) * 180 / Math.PI };
}
function angleBetween(a, b) {
  return Math.acos(clamp(a[0] * b[0] + a[1] * b[1] + a[2] * b[2], -1, 1));
}
function slerp(a, b, t) {
  const w = angleBetween(a, b);
  if (w < 1e-9) return b;
  const s = Math.sin(w), ka = Math.sin((1 - t) * w) / s, kb = Math.sin(t * w) / s;
  return [a[0] * ka + b[0] * kb, a[1] * ka + b[1] * kb, a[2] * ka + b[2] * kb];
}

export function angularDistance(ra1, dec1, ra2, dec2) {
  return angleBetween(toVec(ra1, dec1), toVec(ra2, dec2)) * 180 / Math.PI;
}
