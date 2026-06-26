// Motor de zoom automático.
// Convierte los clicks (con tiempo y posición normalizada) en una lista de
// keyframes {t, scale, x, y} que se interpolan suavemente al renderizar.

export function buildKeyframes(clicks, opts = {}) {
  const { zoom = 2, hold = 1.8, lead = 0.25, ease = 0.45 } = opts;
  const kfs = [];
  if (!clicks.length) return kfs;

  const sorted = [...clicks].sort((a, b) => a.t - b.t);

  // Agrupa clicks cercanos en el tiempo en un mismo "cluster" de zoom.
  const clusters = [];
  let cur = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].t - cur[cur.length - 1].t <= hold) cur.push(sorted[i]);
    else {
      clusters.push(cur);
      cur = [sorted[i]];
    }
  }
  clusters.push(cur);

  for (const c of clusters) {
    const first = c[0];
    const last = c[c.length - 1];
    // Entra el zoom un poco antes del primer click.
    kfs.push({ t: Math.max(0, first.t - lead), scale: 1, x: first.x, y: first.y });
    kfs.push({ t: first.t, scale: zoom, x: first.x, y: first.y });
    // El foco sigue a cada click del cluster.
    for (let i = 1; i < c.length; i++) {
      kfs.push({ t: c[i].t, scale: zoom, x: c[i].x, y: c[i].y });
    }
    // Mantiene y luego sale.
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

// Devuelve {scale, x, y} interpolado en el instante t.
export function sampleZoom(kfs, t) {
  if (!kfs.length) return { scale: 1, x: 0.5, y: 0.5 };
  if (t <= kfs[0].t) return { scale: 1, x: kfs[0].x, y: kfs[0].y };
  const lastKf = kfs[kfs.length - 1];
  if (t >= lastKf.t) return { scale: 1, x: lastKf.x, y: lastKf.y };

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
