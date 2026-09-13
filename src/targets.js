// Famous places Hubble has photographed. Coordinates are J2000 (degrees),
// resolved via CDS Sesame and checked against the CDS/P/HST/EPO coverage.
// `fov` is the field of view (degrees) that frames the Hubble image nicely.
// `lightYears` is an approximate distance; published estimates vary.

export const TARGETS = [
  {
    id: 'pillars',
    name: 'Pillars of Creation',
    kind: 'Star-forming region · Eagle Nebula',
    ra: 274.72, dec: -13.835, fov: 0.06,
    lightYears: 6500,
    fact: 'Towers of cold gas and dust where new stars are being born. The tallest pillar is about 4 light-years long.',
  },
  {
    id: 'carina',
    name: 'Carina Nebula',
    kind: 'Star-forming region',
    ra: 161.2648, dec: -59.6844, fov: 0.35,
    lightYears: 7500,
    fact: 'One of the largest and brightest nebulae in our galaxy, sculpted by the light of some of the most massive stars known.',
  },
  {
    id: 'eta-carinae',
    name: 'Eta Carinae',
    kind: 'Massive star system',
    ra: 161.2648, dec: -59.6844, fov: 0.012,
    lightYears: 7500,
    fact: 'In the 1840s this star erupted and briefly became one of the brightest in the sky. The billowing twin cloud is the debris.',
  },
  {
    id: 'orion',
    name: 'Orion Nebula',
    kind: 'Star-forming region',
    ra: 83.8201, dec: -5.3876, fov: 0.4,
    lightYears: 1350,
    fact: 'The closest large star nursery to Earth. You can see it with your naked eye as a fuzzy spot in Orion’s sword.',
  },
  {
    id: 'horsehead',
    name: 'Horsehead Nebula',
    kind: 'Dark dust cloud',
    ra: 85.2458, dec: -2.4583, fov: 0.12,
    lightYears: 1500,
    fact: 'Hubble photographed it in infrared light, which pierces the dust that makes it look black to our eyes.',
  },
  {
    id: 'crab',
    name: 'Crab Nebula',
    kind: 'Supernova remnant',
    ra: 83.6324, dec: 22.0174, fov: 0.15,
    lightYears: 6500,
    fact: 'The wreckage of a star whose explosion was recorded by astronomers in 1054 AD. A neutron star at its heart spins about 30 times a second.',
  },
  {
    id: 'helix',
    name: 'Helix Nebula',
    kind: 'Planetary nebula',
    ra: 337.4106, dec: -20.8372, fov: 0.3,
    lightYears: 650,
    fact: 'A dying Sun-like star shedding its outer layers — a preview of what our own Sun will do in about 5 billion years.',
  },
  {
    id: 'ring',
    name: 'Ring Nebula',
    kind: 'Planetary nebula',
    ra: 283.3962, dec: 33.0291, fov: 0.03,
    lightYears: 2300,
    fact: 'A glowing shell of gas thrown off by a dying star, seen almost end-on, which is why it looks like a ring.',
  },
  {
    id: 'cats-eye',
    name: 'Cat’s Eye Nebula',
    kind: 'Planetary nebula',
    ra: 269.6392, dec: 66.633, fov: 0.02,
    lightYears: 3300,
    fact: 'One of the most intricate nebulae known. Its faint concentric rings are shells the star puffed out roughly every 1,500 years.',
  },
  {
    id: 'butterfly',
    name: 'Butterfly Nebula',
    kind: 'Planetary nebula',
    ra: 258.4354, dec: -37.1031, fov: 0.05,
    lightYears: 3800,
    fact: 'Its “wings” are gas moving at over 900,000 km/h, ejected by one of the hottest stars known, hidden in the dusty waist.',
  },
  {
    id: 'westerlund-2',
    name: 'Westerlund 2',
    kind: 'Young star cluster',
    ra: 155.9921, dec: -57.7636, fov: 0.1,
    lightYears: 20000,
    fact: 'A cluster of about 3,000 stars only 2 million years old. This image celebrated Hubble’s 25th birthday.',
  },
  {
    id: 'tarantula',
    name: 'Tarantula Nebula',
    kind: 'Star-forming region · Large Magellanic Cloud',
    ra: 84.675, dec: -69.1, fov: 0.35,
    lightYears: 160000,
    fact: 'The brightest star-forming region in our galactic neighbourhood — in another galaxy that orbits the Milky Way.',
  },
  {
    id: 'sombrero',
    name: 'Sombrero Galaxy',
    kind: 'Spiral galaxy',
    ra: 189.9976, dec: -11.6231, fov: 0.16,
    lightYears: 28000000,
    fact: 'A whole galaxy of hundreds of billions of stars, seen nearly edge-on, with a dark lane of dust around its glowing core.',
  },
  {
    id: 'whirlpool',
    name: 'Whirlpool Galaxy',
    kind: 'Interacting spiral galaxy',
    ra: 202.4696, dec: 47.1953, fov: 0.2,
    lightYears: 30000000,
    fact: 'Its spiral arms are being stirred up by the smaller galaxy at the tip of one arm, which is slowly passing behind it.',
  },
  {
    id: 'pinwheel',
    name: 'Pinwheel Galaxy',
    kind: 'Spiral galaxy',
    ra: 210.8024, dec: 54.3488, fov: 0.35,
    lightYears: 21000000,
    fact: 'Nearly twice as wide as the Milky Way. This is one of the largest and most detailed galaxy portraits Hubble has made.',
  },
  {
    id: 'southern-pinwheel',
    name: 'Southern Pinwheel',
    kind: 'Barred spiral galaxy',
    ra: 204.2538, dec: -29.8658, fov: 0.28,
    lightYears: 15000000,
    fact: 'The pink spots along its arms are clouds of glowing hydrogen where new stars are forming right now.',
  },
  {
    id: 'ngc-1300',
    name: 'NGC 1300',
    kind: 'Barred spiral galaxy',
    ra: 49.921, dec: -19.4112, fov: 0.13,
    lightYears: 60000000,
    fact: 'A textbook barred spiral. Our own Milky Way has a bar of stars across its middle too.',
  },
  {
    id: 'antennae',
    name: 'Antennae Galaxies',
    kind: 'Colliding galaxies',
    ra: 180.4708, dec: -18.8676, fov: 0.1,
    lightYears: 45000000,
    fact: 'Two galaxies in the middle of a collision. The crash compresses gas and sets off bursts of billions of new stars.',
  },
  {
    id: 'stephans-quintet',
    name: 'Stephan’s Quintet',
    kind: 'Galaxy group',
    ra: 338.9913, dec: 33.9656, fov: 0.1,
    lightYears: 290000000,
    fact: 'Only four of these five galaxies are really together. The fifth just happens to lie in front, about 7 times closer to us.',
  },
  {
    id: 'abell-370',
    name: 'Abell 370',
    kind: 'Galaxy cluster · gravitational lens',
    ra: 39.97, dec: -1.58, fov: 0.06,
    lightYears: 4000000000,
    fact: 'This cluster is so massive it bends space, stretching the light of galaxies far behind it into glowing arcs.',
  },
  {
    id: 'deep-field',
    name: 'Hubble Deep Field',
    kind: 'Deep field',
    ra: 189.2063, dec: 62.2161, fov: 0.06,
    lightYears: null,
    fact: 'In 1995 Hubble stared at a patch of sky that looked empty. It found about 3,000 galaxies. Almost every dot here is a galaxy.',
  },
  {
    id: 'ultra-deep-field',
    name: 'Hubble Ultra Deep Field',
    kind: 'Deep field',
    ra: 53.1625, dec: -27.7914, fov: 0.06,
    lightYears: null,
    fact: 'About 10,000 galaxies in a patch of sky smaller than a grain of sand held at arm’s length. Some of this light is over 13 billion years old.',
  },
];

// A human-scale sense of when the light left, so the distance lands emotionally.
export function lightStory(t) {
  if (!t.lightYears) return 'Light from the faintest galaxies here left before the Earth existed.';
  const y = t.lightYears;
  const when = y >= 1e9
    ? `${fmt(y / 1e9)} billion years ago`
    : y >= 1e6 ? `${fmt(y / 1e6)} million years ago` : `${y.toLocaleString('en-US')} years ago`;
  let era = '';
  if (y < 1000) era = ' — in the Middle Ages.';
  else if (y < 2000) era = ' — in the early Middle Ages.';
  else if (y < 3000) era = ' — in the age of ancient Greece and Rome.';
  else if (y < 5000) era = ' — while pharaohs ruled Egypt.';
  else if (y < 12000) era = ' — before the pyramids were built.';
  else if (y < 100000) era = ' — during the last Ice Age.';
  else if (y < 300000) era = ' — when the first modern humans lived in Africa.';
  else if (y < 66e6) era = ' — after the dinosaurs had vanished.';
  else if (y < 250e6) era = ' — while dinosaurs walked the Earth.';
  else if (y < 4.5e9) era = ' — long before the dinosaurs.';
  return `The light you are seeing left ${when}${era}`;
}

function fmt(n) {
  return n >= 10 ? Math.round(n).toString() : n.toFixed(1).replace(/\.0$/, '');
}
