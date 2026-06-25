// Renderizadores de formato para la exportación (Módulo 7).
import {
  Document,
  Packer,
  Paragraph,
  HeadingLevel,
  TextRun,
} from "docx";
import type { ExportDoc } from "./document";

// ── Markdown ──
export function toMarkdown(d: ExportDoc): string {
  const lines: string[] = [];
  lines.push(`# ${d.title} — Guion de Demo`, "");
  lines.push("## Ficha del proyecto", "");
  for (const [k, v] of Object.entries(d.meta)) lines.push(`- **${k}:** ${v}`);
  lines.push("");
  lines.push("## Resumen ejecutivo", "", d.executiveSummary, "");
  lines.push("## Propuesta de valor", "", d.valueProposition, "");
  lines.push("## Guion narrado", "", d.narrationScript, "");

  lines.push("## Storyboard", "");
  for (const s of d.scenes) {
    lines.push(`### Escena ${s.order}: ${s.title}`, "");
    lines.push(`- **Descripción:** ${s.description}`);
    lines.push(`- **Narración:** ${s.narration}`);
    lines.push(`- **Texto en pantalla:** ${s.onScreenText}`);
    lines.push(`- **Acción requerida:** ${s.requiredAction}`, "");
  }

  if (d.recordingList.length) {
    lines.push("## Lista de grabaciones", "");
    for (const r of d.recordingList) lines.push(`- **${r.title}:** ${r.description}`);
    lines.push("");
  }

  lines.push("## Prompts por modelo de IA", "");
  for (const p of d.prompts) {
    lines.push(`### ${p.target} (${p.kind}) — ${p.label}`, "", "```", p.content, "```", "");
  }

  lines.push("## Voz en off", "");
  for (const v of d.voiceovers) {
    lines.push(`### Versión ${v.variant}`, "", v.fullText, "");
  }

  lines.push("## CTA final", "", d.ctaFinal, "");
  lines.push(`\n---\n_Generado por Demo Generator AI — ${d.generatedAt}_`);
  return lines.join("\n");
}

// ── HTML (para imprimir → PDF desde el navegador) ──
export function toHtml(d: ExportDoc): string {
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const scenes = d.scenes
    .map(
      (s) => `<div class="scene">
        <h3>Escena ${s.order}: ${esc(s.title)}</h3>
        <p><strong>Descripción:</strong> ${esc(s.description)}</p>
        <p><strong>Narración:</strong> ${esc(s.narration)}</p>
        <p><strong>Texto en pantalla:</strong> ${esc(s.onScreenText)}</p>
        <p><strong>Acción requerida:</strong> ${esc(s.requiredAction)}</p>
      </div>`,
    )
    .join("");
  const prompts = d.prompts
    .map(
      (p) =>
        `<div class="prompt"><h4>${esc(p.target)} · ${esc(p.kind)} — ${esc(
          p.label,
        )}</h4><pre>${esc(p.content)}</pre></div>`,
    )
    .join("");
  const voices = d.voiceovers
    .map((v) => `<div><h4>Versión ${esc(v.variant)}</h4><p>${esc(v.fullText)}</p></div>`)
    .join("");
  const meta = Object.entries(d.meta)
    .map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`)
    .join("");

  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
  <title>${esc(d.title)} — Demo</title>
  <style>
    body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:820px;margin:40px auto;padding:0 24px;color:#18181b;line-height:1.55}
    h1{font-size:28px;border-bottom:3px solid #6d28d9;padding-bottom:8px}
    h2{margin-top:32px;color:#6d28d9}
    table{border-collapse:collapse;width:100%}
    th,td{border:1px solid #e4e4e7;padding:6px 10px;text-align:left}
    th{background:#fafafa;width:160px}
    .scene,.prompt{border-left:3px solid #e4e4e7;padding-left:14px;margin:14px 0}
    pre{background:#f4f4f5;padding:12px;border-radius:8px;white-space:pre-wrap;font-size:13px}
    @media print{body{margin:0}.noprint{display:none}}
  </style></head><body>
  <p class="noprint" style="background:#ede9fe;padding:10px;border-radius:8px">
    Usa <strong>Cmd/Ctrl + P → Guardar como PDF</strong> para exportar este documento.
  </p>
  <h1>${esc(d.title)} — Guion de Demo</h1>
  <h2>Ficha del proyecto</h2><table>${meta}</table>
  <h2>Resumen ejecutivo</h2><p>${esc(d.executiveSummary)}</p>
  <h2>Propuesta de valor</h2><p>${esc(d.valueProposition)}</p>
  <h2>Guion narrado</h2><p>${esc(d.narrationScript)}</p>
  <h2>Storyboard</h2>${scenes}
  <h2>Prompts por modelo de IA</h2>${prompts}
  <h2>Voz en off</h2>${voices}
  <h2>CTA final</h2><p>${esc(d.ctaFinal)}</p>
  <hr><p><em>Generado por Demo Generator AI — ${esc(d.generatedAt)}</em></p>
  </body></html>`;
}

// ── DOCX ──
export async function toDocx(d: ExportDoc): Promise<Buffer> {
  const children: Paragraph[] = [];
  const h = (text: string, level: (typeof HeadingLevel)[keyof typeof HeadingLevel]) =>
    children.push(new Paragraph({ text, heading: level }));
  const p = (text: string) =>
    children.push(new Paragraph({ children: [new TextRun(text)] }));

  h(`${d.title} — Guion de Demo`, HeadingLevel.TITLE);

  h("Ficha del proyecto", HeadingLevel.HEADING_1);
  for (const [k, v] of Object.entries(d.meta)) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: `${k}: `, bold: true }), new TextRun(v)],
      }),
    );
  }

  h("Resumen ejecutivo", HeadingLevel.HEADING_1);
  p(d.executiveSummary);
  h("Propuesta de valor", HeadingLevel.HEADING_1);
  p(d.valueProposition);
  h("Guion narrado", HeadingLevel.HEADING_1);
  p(d.narrationScript);

  h("Storyboard", HeadingLevel.HEADING_1);
  for (const s of d.scenes) {
    h(`Escena ${s.order}: ${s.title}`, HeadingLevel.HEADING_2);
    p(`Descripción: ${s.description}`);
    p(`Narración: ${s.narration}`);
    p(`Texto en pantalla: ${s.onScreenText}`);
    p(`Acción requerida: ${s.requiredAction}`);
  }

  h("Prompts por modelo de IA", HeadingLevel.HEADING_1);
  for (const pr of d.prompts) {
    h(`${pr.target} · ${pr.kind} — ${pr.label}`, HeadingLevel.HEADING_2);
    p(pr.content);
  }

  h("Voz en off", HeadingLevel.HEADING_1);
  for (const v of d.voiceovers) {
    h(`Versión ${v.variant}`, HeadingLevel.HEADING_2);
    p(v.fullText);
  }

  h("CTA final", HeadingLevel.HEADING_1);
  p(d.ctaFinal);

  const doc = new Document({ sections: [{ children }] });
  return Packer.toBuffer(doc);
}

// ── JSON ──
export function toJson(d: ExportDoc): string {
  return JSON.stringify(d, null, 2);
}
