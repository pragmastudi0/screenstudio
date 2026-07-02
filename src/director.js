// Director IA (V1, determinista) — convierte los eventos exactos de la
// grabación en una edición con criterio, parametrizada por "Estilo".
// Sin visión ni OCR: usa clicks/movimientos/tiempos que ya capturamos.

export const STYLES = {
  saas: {
    label: "SaaS Clean",
    zoom: 2.0,
    hold: 1.8,
    motion: "snappy",
    padding: 0.06,
    radius: 14,
    bg: "#111114",
    cursor: "hand",
    clickFx: true,
    sensitivity: "med",
  },
  keynote: {
    label: "Apple Keynote",
    zoom: 1.7,
    hold: 2.4,
    motion: "smooth",
    padding: 0.08,
    radius: 18,
    bg: "#0b0b0f",
    cursor: "spotlight",
    clickFx: true,
    sensitivity: "low",
  },
  premium: {
    label: "Dark Premium",
    zoom: 2.3,
    hold: 1.6,
    motion: "snappy",
    padding: 0.05,
    radius: 22,
    bg: "#000000",
    cursor: "spotlight",
    clickFx: true,
    sensitivity: "med",
  },
};

export const DEFAULT_STYLE = "saas";

// Recorta automáticamente el "tiempo muerto" del inicio y del final
// (antes del primer evento y después del último).
export function computeAutoTrim(clicks, moves, duration) {
  const ts = [...clicks.map((c) => c.t), ...moves.map((m) => m.t)].sort((a, b) => a - b);
  if (!ts.length || !duration) return { trimStart: 0, trimEnd: duration };
  const first = ts[0];
  const last = ts[ts.length - 1];
  const trimStart = Math.max(0, Math.min(first - 0.4, duration - 1));
  const trimEnd = Math.min(duration, Math.max(last + 1.2, trimStart + 1));
  return { trimStart, trimEnd };
}
