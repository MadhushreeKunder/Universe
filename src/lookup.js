// "What is here?" — asks SIMBAD, the CDS astronomical object database, for the most
// notable known object at a point in the sky.
const TAP = 'https://simbad.cds.unistra.fr/simbad/sim-tap/sync';
const LY_PER_PARSEC = 3.2616;
const C_KM_S = 299792.458;
const H0 = 70; // km/s/Mpc

let controller = null;

export async function lookup(ra, dec, radiusDeg) {
  controller?.abort();
  controller = new AbortController();

  const r = Math.min(Math.max(radiusDeg, 0.0005), 0.3);
  // Keep the search circle small and sorted by distance: sorting a wide region by
  // popularity on the server takes SIMBAD 5-15 s, this takes about half a second.
  const query = `
    SELECT TOP 40 b.main_id, n.id AS common, d.description, b.galdim_majaxis, b.nbref AS refs,
      b.plx_value, b.rvz_redshift,
      DISTANCE(POINT('ICRS', b.ra, b.dec), POINT('ICRS', ${ra}, ${dec})) AS dist
    FROM basic AS b
      JOIN otypedef AS d ON b.otype = d.otype
      LEFT OUTER JOIN ident AS n ON n.oidref = b.oid AND n.id LIKE 'NAME %'
    WHERE CONTAINS(POINT('ICRS', b.ra, b.dec), CIRCLE('ICRS', ${ra}, ${dec}, ${r * 1.5})) = 1
    ORDER BY dist`;

  const body = new URLSearchParams({ REQUEST: 'doQuery', LANG: 'ADQL', FORMAT: 'json', QUERY: query });
  const res = await fetch(TAP, { method: 'POST', body, signal: controller.signal });
  if (!res.ok) throw new Error(`SIMBAD ${res.status}`);
  const json = await res.json();

  // An object can come back once per common name; keep the first of each.
  const byId = new Map();
  for (const [id, common, type, sizeArcmin, refs, plx, z, d] of json.data) {
    if (byId.has(id)) continue;
    byId.set(id, { id, common, type, sizeArcmin, refs: refs ?? 0, plx, z, d });
  }

  // The point must fall on the object: inside its catalogued extent, or very close to it.
  const onIt = [...byId.values()].filter((o) => o.d <= r || (o.sizeArcmin && o.d <= o.sizeArcmin / 120));
  if (!onIt.length) return null;
  // Prefer the most studied object (a proxy for "famous"), then the nearest.
  onIt.sort((a, b) => b.refs - a.refs || a.d - b.d);
  const best = onIt[0];
  const catalogId = tidy(best.id);
  const name = best.common ? tidy(best.common.replace(/^NAME\s+/, '')) : catalogId;
  return {
    name,
    also: name !== catalogId ? catalogId : null,
    type: best.type,
    distance: describeDistance(best),
  };
}

function tidy(id) {
  return id.replace(/^\*+\s*/, '').replace(/\s+/g, ' ').trim();
}

function describeDistance(o) {
  if (o.plx && o.plx > 0.2) {
    const ly = (1000 / o.plx) * LY_PER_PARSEC;
    return `about ${roundLy(ly)} light-years away`;
  }
  if (o.z && o.z > 0.002 && o.z < 0.1) {
    const ly = (o.z * C_KM_S / H0) * 1e6 * LY_PER_PARSEC;
    return `about ${roundLy(ly)} light-years away`;
  }
  return null;
}

function roundLy(ly) {
  if (ly >= 1e9) return `${(ly / 1e9).toFixed(1).replace(/\.0$/, '')} billion`;
  if (ly >= 1e6) return `${Math.round(ly / 1e6)} million`;
  if (ly >= 1000) return Math.round(ly / 100) * 100 >= 10000
    ? (Math.round(ly / 1000) * 1000).toLocaleString('en-US')
    : (Math.round(ly / 100) * 100).toLocaleString('en-US');
  return Math.round(ly).toLocaleString('en-US');
}
