"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import type { ProjectContext } from "@/lib/ai/prompts";
import type { Analysis } from "@/lib/ai/schemas";
import {
  generateDemoPackage,
  generateModelPrompts,
  generateVoiceover,
  aiModelName,
} from "@/lib/ai/generate";
import { VOICE_VARIANTS } from "@/lib/constants";
import type { VoiceVariant } from "@prisma/client";

function toContext(project: {
  softwareName: string;
  client: string | null;
  industry: string | null;
  description: string | null;
  systemUrl: string | null;
  videoGoal: string | null;
  demoType: string;
  duration: string;
  analysis: unknown;
}): ProjectContext {
  return {
    softwareName: project.softwareName,
    client: project.client,
    industry: project.industry,
    description: project.description,
    systemUrl: project.systemUrl,
    videoGoal: project.videoGoal,
    demoType: project.demoType,
    duration: project.duration,
    analysis: (project.analysis as Analysis | null) ?? null,
  };
}

/**
 * Módulo 3/4/5 — genera el paquete completo:
 * resumen, propuesta de valor, guion, storyboard, escenas, textos, CTA,
 * lista de grabaciones, prompts de video/imagen, prompts por modelo y
 * las 4 variantes de voz en off. Persiste todo en la BD.
 */
export async function runGenerationAction(projectId: string) {
  const session = await requireUser();
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: session.userId },
  });
  if (!project) return { ok: false as const, error: "Proyecto no encontrado" };

  await prisma.project.update({
    where: { id: projectId },
    data: { status: "GENERATING" },
  });

  const ctx = toContext(project);
  const model = aiModelName();

  // Generaciones en paralelo (paquete + prompts por modelo + 4 voces).
  const [pkg, modelPrompts, ...voices] = await Promise.all([
    generateDemoPackage(ctx),
    generateModelPrompts(ctx),
    ...VOICE_VARIANTS.map((v) => generateVoiceover(ctx, v.value)),
  ]);

  // Persistencia atómica: limpia lo anterior y reescribe.
  await prisma.$transaction([
    prisma.scene.deleteMany({ where: { projectId } }),
    prisma.prompt.deleteMany({ where: { projectId } }),
    prisma.voiceover.deleteMany({ where: { projectId } }),
    prisma.generation.upsert({
      where: { projectId },
      create: {
        projectId,
        model,
        executiveSummary: pkg.executiveSummary,
        valueProposition: pkg.valueProposition,
        narrationScript: pkg.narrationScript,
        ctaFinal: pkg.ctaFinal,
        storyboard: pkg.scenes as object,
        onScreenTexts: pkg.onScreenTexts as object,
        recordingList: pkg.recordingList as object,
        videoPrompts: pkg.videoPrompts as object,
        imagePrompts: pkg.imagePrompts as object,
        raw: pkg as object,
      },
      update: {
        model,
        executiveSummary: pkg.executiveSummary,
        valueProposition: pkg.valueProposition,
        narrationScript: pkg.narrationScript,
        ctaFinal: pkg.ctaFinal,
        storyboard: pkg.scenes as object,
        onScreenTexts: pkg.onScreenTexts as object,
        recordingList: pkg.recordingList as object,
        videoPrompts: pkg.videoPrompts as object,
        imagePrompts: pkg.imagePrompts as object,
        raw: pkg as object,
      },
    }),
    prisma.scene.createMany({
      data: pkg.scenes.map((s) => ({
        projectId,
        order: s.order,
        title: s.title,
        description: s.description,
        narration: s.narration,
        onScreenText: s.onScreenText,
        requiredAction: s.requiredAction,
      })),
    }),
    prisma.prompt.createMany({
      data: modelPrompts.prompts.map((p) => ({
        projectId,
        target: p.target,
        kind: p.kind,
        label: p.label,
        content: p.content,
      })),
    }),
    prisma.voiceover.createMany({
      data: voices.map((v) => ({
        projectId,
        variant: v.variant as VoiceVariant,
        fullText: v.fullText,
        segments: v.segments as object,
      })),
    }),
    prisma.project.update({
      where: { id: projectId },
      data: { status: "READY" },
    }),
  ]);

  revalidatePath(`/projects/${projectId}`);
  return { ok: true as const };
}
