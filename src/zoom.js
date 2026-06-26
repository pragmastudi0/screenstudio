// Motor de zoom automático.
// Flujo: clicks → segmentos de zoom (editables/eliminables) → keyframes
// interpolados {t, scale, x, y}.

const CLUSTER_GAP = 1.8; // s: clicks más cercanos forman un mismo zoom

let _id = 0;

// Agrupa los clicks en segmentos de zoom. Cada segmento puede activarse o
// desactivarse de forma independiente desde el editor.
export function buildSegments(clicks) {
  const sorted = [...clicks].sort((a, b) => a.t - b.t);
  const segments = [];
  if (!sorted.length) return segments;

  let cur = [sorted[0]];
  const flush = () => {
    segments.push({
      id: ++_id,
      clicks: cur,
      start: cur[0].t,
      end: cur[cur.length - 1].t,
      enabled: true,
    });
  };
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].t - cur[cur.length - 1].t <= CLUSTER_GAP) cur.push(sorted[i]);
    else {
      flush();
      cur = [sorted[i]];
    }
  }
  flush();
  return segments;
}

// Crea un segmento manual centrado (para "+ Zoom aquí").
export function makeManualSegment(t, x = 0.5, y = 0.5) {
  return { id: ++_id, clicks: [{ t, x, y }], start: t, end: t, enabled: true, manual: true };
}

// Convierte los segmentos activos en keyframes.
export function segmentsToKeyframes(segments, opts = {}) {
  const { zoom = 2, hold = 1.8, lead = 0.25, ease = 0.45 } = opts;
  const kfs = [];
  for (const seg of segments) {
    if (!seg.enabled) continue;
    const c = seg.clicks;
    const first = c[0];
    const last = c[c.length - 1];
    kfs.push({ t: Math.max(0, first.t - lead), scale: 1, x: first.x, y: first.y });
    kfs.push({ t: first.t, scale: zoom, x: first.x, y: first.y });
    for (let i = 1; i < c.length; i++) kfs.push({ t: c[i].t, scale: zoom, x: c[i].x, y: c[i].y });
    kfs.push({ t: last.t + hold, scale: zoom, x: last.x, y: last.y });
    kfs.push({ t: last.t + hold + ease, scale: 1, x: last.x, y: last.y });
  }
  kfs.sort((a, b) => a.t - b.t);
  return kfs;
}

function smoothstep(u) {
  if (u <= 0) return 0;
  if (u >= 1) return 1;
  return u * u * (3 - 2 * u);
}

// Interpola el zoom en el instante t.
export function sampleZoom(kfs, t) {
  if (!kfs.length) return { scale: 1, x: 0.5, y: 0.5 };
  if (t <= kfs[0].t) return { scale: 1, x: kfs[0].x, y: kfs[0].y };
  const last = kfs[kfs.length - 1];
  if (t >= last.t) return { scale: 1, x: last.x, y: last.y };

  let i = 0;
  while (i < kfs.length - 1 && kfs[i + 1].t <= t) i++;
  const a = kfs[i];
  const b = kfs[i + 1];
  const span = b.t - a.t || 1e-6;
  const u = smoothstep((t - a.t) / span);
  return {
    scale: a.scale + (b.scale - a.scale) * u,
    x: a.x + (b.x - a.x) * u,
    y: a.y + (b.y - a.y) * u,
  };
}

// Interpola una posición a lo largo de un camino [{t,x,y}] (cursor).
export function samplePath(path, t) {
  if (!path.length) return null;
  if (t <= path[0].t) return { x: path[0].x, y: path[0].y };
  const last = path[path.length - 1];
  if (t >= last.t) return { x: last.x, y: last.y };
  let i = 0;
  while (i < path.length - 1 && path[i + 1].t <= t) i++;
  const a = path[i];
  const b = path[i + 1];
  const span = b.t - a.t || 1e-6;
  const u = (t - a.t) / span;
  return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u };
}
