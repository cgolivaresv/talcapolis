/**
 * Genera src/data/talca-layout.json a partir de OpenStreetMap (Overpass API):
 *   - posición real de cada intersección del tablero (metros, x = oriente, y = norte)
 *   - sentido del tránsito de cada tramo (both | forward | backward), donde
 *     "forward" significa de `from` a `to` del tramo.
 *
 * Uso:  node scripts/build-talca-data.mjs [ruta-a-osm.json]
 * Sin argumento descarga los datos de Overpass. Requiere Node 22.6+ (importa board.ts).
 * Datos © colaboradores de OpenStreetMap (ODbL).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildBoard } from '../src/engine/board.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(here, '../src/data/talca-layout.json');

const LAT0 = -35.4264;
const LON0 = -71.6555;
const KX = 111320 * Math.cos((LAT0 * Math.PI) / 180);
const KY = 110540;
const toM = (g) => ({ x: (g.lon - LON0) * KX, y: (g.lat - LAT0) * KY });
/** Centro de Talca (Plaza de Armas aprox.), para desambiguar calles repetidas en otros barrios. */
const REF = toM({ lat: -35.4264, lon: -71.6655 });

const BBOX = '-35.4420,-71.6800,-35.4180,-71.6300';
const DRIVABLE = new Set([
  'motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'unclassified', 'residential',
  'living_street', 'pedestrian', 'primary_link', 'secondary_link', 'tertiary_link', 'trunk_link',
]);

async function loadOsm() {
  if (process.argv[2]) return JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  const q = `[out:json][timeout:60];way["highway"]["name"](${BBOX});out tags geom;`;
  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    body: new URLSearchParams({ data: q }),
    headers: { 'User-Agent': 'talcapolis-data-build' },
  });
  if (!res.ok) throw new Error(`Overpass respondió ${res.status}`);
  return res.json();
}

/** "2 Poniente" a partir de name / alt_name / old_name / loc_name (p. ej. Alameda = 4 Norte). */
const NAME_ALIASES = [
  [/Silva Henr[ií]quez/i, '1 Poniente'],
  [/Alameda.*O.?Higgins/i, '4 Norte'],
  [/Salvador Allende/i, '11 Oriente'],
  [/Monse[ñn]or Larra[ií]n|Manuel Larra[ií]n/i, '2 Sur'],
];

function streetKey(tags) {
  const all = [tags.name, tags.alt_name, tags.old_name, tags.loc_name].filter(Boolean);
  for (const n of all) {
    // Solo avenidas con nombre propio que reemplazan a una calle numerada del tablero.
    for (const [re, key] of NAME_ALIASES) if (re.test(n) && !/Pasaje|Pje/i.test(n)) return key;
  }
  for (const n of all) {
    const m = n.match(/(?:^|\s)(\d+)\s+(Norte|Sur|Oriente|Poniente)\b/i);
    if (m) return `${m[1]} ${m[2][0].toUpperCase()}${m[2].slice(1).toLowerCase()}`;
  }
  return null;
}

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function closestOnSegment(p, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const l2 = dx * dx + dy * dy;
  const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2));
  return { x: a.x + t * dx, y: a.y + t * dy };
}

/** Par de puntos más cercanos entre dos segmentos (o el cruce exacto). */
function segPair(a, b, c, d) {
  const r = { x: b.x - a.x, y: b.y - a.y }, s = { x: d.x - c.x, y: d.y - c.y };
  const den = r.x * s.y - r.y * s.x;
  if (Math.abs(den) > 1e-9) {
    const t = ((c.x - a.x) * s.y - (c.y - a.y) * s.x) / den;
    const u = ((c.x - a.x) * r.y - (c.y - a.y) * r.x) / den;
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
      const p = { x: a.x + t * r.x, y: a.y + t * r.y };
      return { d: 0, p };
    }
  }
  let best = null;
  for (const [p, seg] of [[a, [c, d]], [b, [c, d]], [c, [a, b]], [d, [a, b]]]) {
    const q = closestOnSegment(p, seg[0], seg[1]);
    const dd = dist(p, q);
    if (!best || dd < best.d) best = { d: dd, p: { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 } };
  }
  return best;
}

function intersectionPoint(waysA, waysB) {
  const cands = [];
  for (const wa of waysA) for (let i = 0; i < wa.pts.length - 1; i++)
    for (const wb of waysB) for (let j = 0; j < wb.pts.length - 1; j++) {
      const r = segPair(wa.pts[i], wa.pts[i + 1], wb.pts[j], wb.pts[j + 1]);
      if (r.d <= 40) cands.push(r);
    }
  if (!cands.length) return null;
  // Agrupa los cruces candidatos (doble calzada = varios cruces casi iguales) y elige el
  // grupo más cercano al centro de la ciudad: las mismas calles numeradas se repiten en otros barrios.
  const clusters = [];
  for (const c of cands) {
    const k = clusters.find((cl) => dist(cl.center, c.p) <= 60);
    if (k) { k.items.push(c.p); k.center = { x: k.items.reduce((s, p) => s + p.x, 0) / k.items.length, y: k.items.reduce((s, p) => s + p.y, 0) / k.items.length }; }
    else clusters.push({ items: [c.p], center: c.p });
  }
  clusters.sort((a, b) => dist(a.center, REF) - dist(b.center, REF));
  const best = clusters[0].center;
  return { x: best.x, y: best.y, far: dist(best, REF) > 1800 ? 1 : 0 };
}

const osm = await loadOsm();
const byKey = new Map();
for (const w of osm.elements) {
  if (!w.geometry || !DRIVABLE.has(w.tags?.highway)) continue;
  const key = streetKey(w.tags);
  if (!key) continue;
  if (!byKey.has(key)) byKey.set(key, []);
  byKey.get(key).push({ id: w.id, oneway: w.tags.oneway ?? 'no', pts: w.geometry.map(toM) });
}

const board = buildBoard();
const diag = { missingStreets: [], missingIntersections: [], ambiguous: [], noWayForSegment: [] };
const positions = {};

for (const it of board.intersections) {
  const wa = byKey.get(it.vertical.name);
  const wb = byKey.get(it.horizontal.name);
  if (!wa || !wb) {
    for (const s of [it.vertical, it.horizontal]) if (!byKey.has(s.name) && !diag.missingStreets.includes(s.name)) diag.missingStreets.push(s.name);
    diag.missingIntersections.push(it.id);
    continue;
  }
  const p = intersectionPoint(wa, wb);
  if (!p) { diag.missingIntersections.push(it.id); continue; }
  if (p.far) diag.ambiguous.push(`${it.id} (${p.far} candidatos lejanos)`);
  positions[it.id] = { x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10 };
}

const directions = {};
const stats = { both: 0, forward: 0, backward: 0 };
for (const seg of board.segments) {
  const A = positions[seg.from], B = positions[seg.to];
  if (!A || !B) { directions[seg.id] = 'both'; diag.noWayForSegment.push(`${seg.id} (sin posición)`); continue; }
  const M = { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 };
  const ab = { x: B.x - A.x, y: B.y - A.y };
  const caps = new Set();
  let found = 0;
  for (const w of byKey.get(seg.street.name) ?? []) {
    let best = null;
    for (let i = 0; i < w.pts.length - 1; i++) {
      const q = closestOnSegment(M, w.pts[i], w.pts[i + 1]);
      const d = dist(M, q);
      if (!best || d < best.d) best = { d, v: { x: w.pts[i + 1].x - w.pts[i].x, y: w.pts[i + 1].y - w.pts[i].y } };
    }
    if (!best || best.d > 45) continue;
    found++;
    const ow = String(w.oneway).toLowerCase();
    if (ow === 'yes' || ow === 'true' || ow === '1' || ow === '-1' || ow === 'reverse') {
      const sign = ow === '-1' || ow === 'reverse' ? -1 : 1;
      const dot = sign * (best.v.x * ab.x + best.v.y * ab.y);
      caps.add(dot >= 0 ? 'f' : 'b');
    } else {
      caps.add('f'); caps.add('b');
    }
  }
  if (!found) { directions[seg.id] = 'both'; diag.noWayForSegment.push(seg.id); continue; }
  const dir = caps.has('f') && caps.has('b') ? 'both' : caps.has('f') ? 'forward' : 'backward';
  directions[seg.id] = dir;
  stats[dir]++;
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(
  OUT,
  JSON.stringify({
    meta: {
      source: 'OpenStreetMap (Overpass API)',
      license: 'ODbL, © colaboradores de OpenStreetMap',
      origin: { lat: LAT0, lon: LON0 },
      units: 'metros; x = oriente, y = norte',
      generatedAt: new Date().toISOString().slice(0, 10),
      directionNote: "forward = de 'from' a 'to' del tramo",
    },
    intersections: positions,
    directions,
  }, null, 1),
);

console.log('intersecciones con posición:', Object.keys(positions).length, '/', board.intersections.length);
console.log('sentidos:', stats, '| ambos por falta de datos:', diag.noWayForSegment.length);
console.log(JSON.stringify(diag, null, 1));
