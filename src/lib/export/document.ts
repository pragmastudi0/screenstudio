// Construye un documento normalizado del proyecto a partir de la BD,
// reutilizable por todos los formatos de exportación (Módulo 7).
import { prisma } from "@/lib/prisma";
import {
  DEMO_TYPES,
  DURATIONS,
  PROMPT_TARGETS,
  VOICE_VARIANTS,
} from "@/lib/constants";

export interface ExportDoc {
  title: string;
  meta: Record<string, string>;
  executiveSummary: string;
  valueProposition: string;
  narrationScript: string;
  ctaFinal: string;
  scenes: {
    order: number;
    title: string;
    description: string;
    narration: string;
    onScreenText: string;
    requiredAction: string;
  }[];
  recordingList: { title: string; description: string }[];
  prompts: { target: string; kind: string; label: string; content: string }[];
  voiceovers: { variant: string; fullText: string }[];
  generatedAt: string;
}

export async function buildExportDoc(
  projectId: string,
  userId: string,
): Promise<ExportDoc | null> {
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
    include: {
      generation: true,
      scenes: { orderBy: { order: "asc" } },
      prompts: true,
      voiceovers: true,
    },
  });
  if (!project) return null;

  const g = project.generation;
  const demo = DEMO_TYPES.find((d) => d.value === project.demoType)?.label ?? "";
  const dur = DURATIONS.find((d) => d.value === project.duration)?.label ?? "";

  return {
    title: project.softwareName,
    meta: {
      Cliente: project.client ?? "—",
      Industria: project.industry ?? "—",
      "Tipo de demo": demo,
      Duración: dur,
      "URL del sistema": project.systemUrl ?? "—",
      Objetivo: project.videoGoal ?? "—",
    },
    executiveSummary: g?.executiveSummary ?? "",
    valueProposition: g?.valueProposition ?? "",
    narrationScript: g?.narrationScript ?? "",
    ctaFinal: g?.ctaFinal ?? "",
    scenes: project.scenes.map((s) => ({
      order: s.order,
      title: s.title,
      description: s.description ?? "",
      narration: s.narration ?? "",
      onScreenText: s.onScreenText ?? "",
      requiredAction: s.requiredAction ?? "",
    })),
    recordingList: ((g?.recordingList as { title: string; description: string }[]) ?? []),
    prompts: project.prompts.map((p) => ({
      target: PROMPT_TARGETS.find((t) => t.value === p.target)?.label ?? p.target,
      kind: p.kind,
      label: p.label,
      content: p.content,
    })),
    voiceovers: project.voiceovers.map((v) => ({
      variant: VOICE_VARIANTS.find((x) => x.value === v.variant)?.label ?? v.variant,
      fullText: v.fullText,
    })),
    generatedAt: new Date(project.updatedAt).toISOString(),
  };
}
