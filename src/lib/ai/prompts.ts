// Constructores de prompts para Gemini. Todo en español.
import { DEMO_TYPES, DURATIONS, VOICE_VARIANTS } from "@/lib/constants";
import type { Analysis } from "./schemas";

export interface ProjectContext {
  softwareName: string;
  client?: string | null;
  industry?: string | null;
  description?: string | null;
  systemUrl?: string | null;
  videoGoal?: string | null;
  demoType: string;
  duration: string;
  analysis?: Analysis | null;
}

export const SYSTEM_DIRECTOR = `Eres un director creativo experto en videos de demostración de software (sales demos, onboarding y capacitación).
Escribes en español neutro, claro y profesional. Tu trabajo combina storytelling, marketing B2B y conocimiento técnico de producto.
Siempre devuelves contenido accionable, concreto y listo para producir.`;

function ctxBlock(c: ProjectContext): string {
  const demo = DEMO_TYPES.find((d) => d.value === c.demoType);
  const dur = DURATIONS.find((d) => d.value === c.duration);
  const a = c.analysis;
  return [
    `Software: ${c.softwareName}`,
    c.client && `Cliente: ${c.client}`,
    c.industry && `Industria: ${c.industry}`,
    c.description && `Descripción: ${c.description}`,
    c.systemUrl && `URL del sistema: ${c.systemUrl}`,
    c.videoGoal && `Objetivo del video: ${c.videoGoal}`,
    demo && `Tipo de demo: ${demo.label} (${demo.hint})`,
    dur && `Duración objetivo: ${dur.label} (~${dur.seconds}s)`,
    a?.features?.length && `Funcionalidades detectadas: ${a.features.join(", ")}`,
    a?.benefits?.length && `Beneficios: ${a.benefits.join(", ")}`,
    a?.useCases?.length && `Casos de uso: ${a.useCases.join(", ")}`,
    a?.modules?.length && `Módulos: ${a.modules.join(", ")}`,
  ]
    .filter(Boolean)
    .join("\n");
}

/** Análisis de material textual extraído de las capturas. */
export function analysisPrompt(softwareName: string, extractedText: string): string {
  return `Analiza el siguiente material de un software llamado "${softwareName}" y extrae información estructurada.

MATERIAL:
${extractedText.slice(0, 12000)}

Devuelve EXCLUSIVAMENTE un JSON con esta forma:
{
  "features": ["funcionalidad concreta", ...],
  "benefits": ["beneficio de negocio", ...],
  "useCases": ["caso de uso real", ...],
  "modules": ["módulo o sección del sistema", ...]
}
Máximo 8 elementos por lista. Sé específico y evita generalidades.`;
}

/** Paquete completo de demo (Módulo 3). */
export function demoPackagePrompt(c: ProjectContext): string {
  const dur = DURATIONS.find((d) => d.value === c.duration);
  const sceneCount = dur ? Math.max(3, Math.round(dur.seconds / 12)) : 5;
  return `Diseña el paquete completo para producir un video de demostración.

CONTEXTO DEL PROYECTO:
${ctxBlock(c)}

Genera EXACTAMENTE ${sceneCount} escenas adaptadas a la duración objetivo.

Devuelve EXCLUSIVAMENTE un JSON con esta forma:
{
  "executiveSummary": "resumen ejecutivo del sistema (1 párrafo)",
  "valueProposition": "propuesta de valor diferencial (2-3 frases)",
  "narrationScript": "guion narrado completo y fluido para locutar",
  "ctaFinal": "llamada a la acción final potente",
  "scenes": [
    {
      "order": 1,
      "title": "título corto de la escena",
      "description": "qué se muestra en pantalla",
      "narration": "texto que dice el locutor en esta escena",
      "onScreenText": "texto/título que aparece sobreimpreso",
      "requiredAction": "acción de grabación o captura necesaria"
    }
  ],
  "onScreenTexts": [{ "scene": 1, "text": "texto en pantalla" }],
  "recordingList": [{ "title": "qué grabar", "description": "detalle de la toma" }],
  "videoPrompts": [{ "target": "VEO", "content": "prompt para video IA" }],
  "imagePrompts": [{ "target": "MIDJOURNEY", "content": "prompt para imagen IA" }]
}
El narrationScript debe poder leerse en aproximadamente ${dur?.seconds ?? 60} segundos.`;
}

/** Prompts optimizados por modelo de IA (Módulo 4). */
export function modelPromptsPrompt(c: ProjectContext): string {
  return `Crea prompts optimizados, listos para copiar y pegar, para generar el material visual del video de demo del software "${c.softwareName}".

CONTEXTO:
${ctxBlock(c)}

Genera prompts para estos modelos, respetando su estilo óptimo:
- VEO (video, cinematográfico, describe cámara/movimiento/iluminación)
- KLING (video, movimiento realista, describe escena y dinámica)
- RUNWAY (video Gen-3, describe estética y transición)
- MIDJOURNEY (imagen, usa descriptores visuales y parámetros como --ar 16:9)
- CHATGPT (texto, instrucción para refinar el guion)
- CLAUDE (texto, instrucción para estructurar el storyboard)

Devuelve EXCLUSIVAMENTE un JSON:
{
  "prompts": [
    { "target": "VEO", "kind": "VIDEO", "label": "Escena hero del producto", "content": "..." }
  ]
}
Incluye al menos un prompt por modelo. Cada "content" debe ser autocontenido.`;
}

/** Voz en off en una variante de tono (Módulo 5). */
export function voiceoverPrompt(c: ProjectContext, variant: string): string {
  const v = VOICE_VARIANTS.find((x) => x.value === variant);
  return `Escribe el guion de voz en off para el video de demo de "${c.softwareName}".

CONTEXTO:
${ctxBlock(c)}

Tono requerido: ${v?.label} (${v?.tone}).
Optimiza el texto para locución con ElevenLabs (frases naturales, puntuación que marque pausas).

Devuelve EXCLUSIVAMENTE un JSON:
{
  "variant": "${variant}",
  "fullText": "guion completo seguido",
  "segments": [{ "scene": 1, "text": "narración de la escena 1" }]
}`;
}
