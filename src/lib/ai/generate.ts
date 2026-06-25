import "server-only";
import { env } from "@/lib/env";
import { geminiJson, isGeminiConfigured } from "./gemini";
import {
  analysisPrompt,
  demoPackagePrompt,
  modelPromptsPrompt,
  voiceoverPrompt,
  SYSTEM_DIRECTOR,
  type ProjectContext,
} from "./prompts";
import {
  analysisSchema,
  demoPackageSchema,
  modelPromptsSchema,
  voiceoverSchema,
  type Analysis,
  type DemoPackage,
  type ModelPrompts,
  type VoiceoverDraft,
} from "./schemas";
import {
  fallbackAnalysis,
  fallbackDemoPackage,
  fallbackModelPrompts,
  fallbackVoiceover,
} from "./fallback";

// Cada función intenta usar Gemini; si no hay clave o falla, usa el fallback
// determinista para que la app siga funcionando.

export async function generateAnalysis(
  ctx: { softwareName: string },
  extractedText: string,
): Promise<Analysis> {
  if (!isGeminiConfigured() || !extractedText.trim()) {
    return fallbackAnalysis(ctx, extractedText);
  }
  try {
    const raw = await geminiJson<unknown>(
      analysisPrompt(ctx.softwareName, extractedText),
      { system: SYSTEM_DIRECTOR },
    );
    return analysisSchema.parse(raw);
  } catch (e) {
    console.error("[ai] generateAnalysis fallback:", e);
    return fallbackAnalysis(ctx, extractedText);
  }
}

export async function generateDemoPackage(ctx: ProjectContext): Promise<DemoPackage> {
  if (!isGeminiConfigured()) return fallbackDemoPackage(ctx);
  try {
    const raw = await geminiJson<unknown>(demoPackagePrompt(ctx), {
      system: SYSTEM_DIRECTOR,
    });
    return demoPackageSchema.parse(raw);
  } catch (e) {
    console.error("[ai] generateDemoPackage fallback:", e);
    return fallbackDemoPackage(ctx);
  }
}

export async function generateModelPrompts(ctx: ProjectContext): Promise<ModelPrompts> {
  if (!isGeminiConfigured()) return fallbackModelPrompts(ctx);
  try {
    const raw = await geminiJson<unknown>(modelPromptsPrompt(ctx), {
      system: SYSTEM_DIRECTOR,
    });
    return modelPromptsSchema.parse(raw);
  } catch (e) {
    console.error("[ai] generateModelPrompts fallback:", e);
    return fallbackModelPrompts(ctx);
  }
}

export async function generateVoiceover(
  ctx: ProjectContext,
  variant: string,
): Promise<VoiceoverDraft> {
  if (!isGeminiConfigured()) return fallbackVoiceover(ctx, variant);
  try {
    const raw = await geminiJson<unknown>(voiceoverPrompt(ctx, variant), {
      system: SYSTEM_DIRECTOR,
      temperature: 0.8,
    });
    return voiceoverSchema.parse(raw);
  } catch (e) {
    console.error("[ai] generateVoiceover fallback:", e);
    return fallbackVoiceover(ctx, variant);
  }
}

export const aiModelName = () => env.GEMINI_MODEL;
