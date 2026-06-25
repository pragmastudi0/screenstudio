import { z } from "zod";

// Resultado del análisis de capturas (Módulo 2)
export const analysisSchema = z.object({
  features: z.array(z.string()).default([]),
  benefits: z.array(z.string()).default([]),
  useCases: z.array(z.string()).default([]),
  modules: z.array(z.string()).default([]),
});
export type Analysis = z.infer<typeof analysisSchema>;

export const sceneSchema = z.object({
  order: z.number(),
  title: z.string(),
  description: z.string(),
  narration: z.string(),
  onScreenText: z.string(),
  requiredAction: z.string(),
});
export type SceneDraft = z.infer<typeof sceneSchema>;

// Paquete completo (Módulo 3)
export const demoPackageSchema = z.object({
  executiveSummary: z.string(),
  valueProposition: z.string(),
  narrationScript: z.string(),
  ctaFinal: z.string(),
  scenes: z.array(sceneSchema).default([]),
  onScreenTexts: z
    .array(z.object({ scene: z.number(), text: z.string() }))
    .default([]),
  recordingList: z
    .array(z.object({ title: z.string(), description: z.string() }))
    .default([]),
  videoPrompts: z
    .array(z.object({ target: z.string(), content: z.string() }))
    .default([]),
  imagePrompts: z
    .array(z.object({ target: z.string(), content: z.string() }))
    .default([]),
});
export type DemoPackage = z.infer<typeof demoPackageSchema>;

// Prompts por modelo (Módulo 4)
export const modelPromptsSchema = z.object({
  prompts: z.array(
    z.object({
      target: z.enum(["VEO", "KLING", "RUNWAY", "MIDJOURNEY", "CHATGPT", "CLAUDE"]),
      kind: z.enum(["VIDEO", "IMAGE", "TEXT"]),
      label: z.string(),
      content: z.string(),
    }),
  ),
});
export type ModelPrompts = z.infer<typeof modelPromptsSchema>;

// Voz en off (Módulo 5)
export const voiceoverSchema = z.object({
  variant: z.enum(["FORMAL", "COMMERCIAL", "CORPORATE", "EMOTIONAL"]),
  fullText: z.string(),
  segments: z.array(z.object({ scene: z.number(), text: z.string() })),
});
export type VoiceoverDraft = z.infer<typeof voiceoverSchema>;
