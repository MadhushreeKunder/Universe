# Reach — the real universe, in your hands

Explore the actual sky with hand gestures. Everything on screen is real telescope data:
the whole sky from the Digitized Sky Survey, and NASA/ESA Hubble photographs pinned
exactly where Hubble pointed.

```sh
npm install
npm run dev     # open http://localhost:5173 in Chrome
```

## Gestures (webcam)

| Gesture | Does |
|---|---|
| Pinch & move | Grab and drag the sky (let go to drift) |
| Spread thumb & index (other fingers tucked in) | Wider to zoom in, closer to zoom out |
| Pinch with both hands | Pull apart to zoom in, push together to zoom out |
| Point & hold on a marker or place name | Fly there |
| Hold your fingertip still over the sky | "What is this?" (looks it up in SIMBAD) |
| Hold a fist | Fly back to the whole sky |

Mouse works too: drag, scroll to zoom, click places, pause the pointer to ask what's there.
Escape flies home.

## How it works

- [`src/sky.js`](src/sky.js) — [Aladin Lite](https://aladin.cds.unistra.fr/AladinLite/) renders
  HiPS tile pyramids: `CDS/P/DSS2/color` for the whole sky, `CDS/P/HST/EPO` for Hubble. Also the
  flights between targets.
- [`src/hands.js`](src/hands.js) — MediaPipe Hand Landmarker on the webcam, turned into pinch / fist
  / cursor states with One Euro smoothing. Runs entirely in the browser.
- [`src/targets.js`](src/targets.js) — curated Hubble targets: positions (resolved via CDS Sesame and
  checked against Hubble coverage), framing, distances and facts.
- [`src/lookup.js`](src/lookup.js) — asks the [SIMBAD](https://simbad.cds.unistra.fr/) database for the
  most notable known object at a point, with its distance when one is catalogued.

## Known limits

- Imagery streams from CDS in Strasbourg. On a slow route to that server, deep zooms sharpen
  progressively over tens of seconds. Serving the curated targets' tiles from your own CDN would
  make them instant.
- Distances are approximate; published estimates vary for many objects.

Imagery: NASA, ESA & STScI (Hubble); STScI Digitized Sky Survey. Sky rendering by Aladin Lite (CDS).
