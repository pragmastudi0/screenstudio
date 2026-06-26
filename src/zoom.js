// Motor de zoom automático.
// Flujo: clicks → segmentos de zoom (editables/eliminables) → keyframes
// interpolados {t, scale, x, y}.

let _id = 0;

// Agrupa los clicks en segmentos de zoom "inteligentes":
//   1) agrupa clicks cercanos en el tiempo (clusterGap),
//   2) fusiona grupos muy seguidos para no entrar/salir del zoom a cada rato
//      (mergeGap) — dentro de un segmento la cámara se desplaza suavemente,
//   3) ignora un click aislado si dura menos que minDwell (clicks sueltos
//      de paso que no merecen zoom).
// Cada segmento se puede activar/desactivar o eliminar desde el editor.
export function buildSegments(clicks, opts = {}) {
  const { clusterGap = 2.2, mergeGap = 1.2 } = opts;
  const sorted = [...clicks].sort((a, b) => a.t - b.t);
  if (!sorted.length) return [];

  // 1) Agrupación temporal.
  const clusters = [];
  let cur = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].t - cur[cur.length - 1].t <= clusterGap) cur.push(sorted[i]);
    else {
      clusters.push(cur);
      cur = [sorted[i]];
    }
  }
  clusters.push(cur);

  // 2) Fusión de grupos casi consecutivos (evita el efecto "yo-yo").
  const merged = [];
  let m = clusters[0];
  for (let i = 1; i < clusters.length; i++) {
    const prevEnd = m[m.length - 1].t;
    const nextStart = clusters[i][0].t;
    if (nextStart - prevEnd <= mergeGap) m = m.concat(clusters[i]);
    else {
      merged.push(m);
      m = clusters[i];
    }
  }
  merged.push(m);

  return merged.map((c) => ({
    id: ++_id,
    clicks: c,
    start: c[0].t,
    end: c[c.length - 1].t,
    enabled: true,
  }));
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
    const segHold = seg.hold != null ? seg.hold : hold; // duración propia o global
    const segZoom = seg.zoom != null ? seg.zoom : zoom; // intensidad propia o global
    // Si el usuario reubicó el zoom (seg.focus), se usa ese punto fijo;
    // si no, la cámara sigue a los clicks del segmento.
    const f = seg.focus || null;
    const x0 = f ? f.x : first.x;
    const y0 = f ? f.y : first.y;
    const xL = f ? f.x : last.x;
    const yL = f ? f.y : last.y;
    kfs.push({ t: Math.max(0, first.t - lead), scale: 1, x: x0, y: y0 });
    kfs.push({ t: first.t, scale: segZoom, x: x0, y: y0 });
    if (!f) {
      for (let i = 1; i < c.length; i++) kfs.push({ t: c[i].t, scale: segZoom, x: c[i].x, y: c[i].y });
    }
    kfs.push({ t: last.t + segHold, scale: segZoom, x: xL, y: yL });
    kfs.push({ t: last.t + segHold + ease, scale: 1, x: xL, y: yL });
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
