"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function listTemplates() {
  return prisma.template.findMany({ orderBy: { category: "asc" } });
}

// Crea un proyecto pre-rellenado a partir de una plantilla (Módulo 8).
export async function applyTemplateAction(templateId: string) {
  const session = await requireUser();
  const tpl = await prisma.template.findUnique({ where: { id: templateId } });
  if (!tpl) return { ok: false as const, error: "Plantilla no encontrada" };

  const s = tpl.structure as {
    softwareName?: string;
    industry?: string;
    description?: string;
    videoGoal?: string;
    demoType?: "COMMERCIAL" | "ONBOARDING" | "TRAINING" | "LAUNCH";
    duration?: "SEC_30" | "SEC_60" | "MIN_3" | "MIN_5";
  };

  const project = await prisma.project.create({
    data: {
      userId: session.userId,
      softwareName: s.softwareName ?? `Demo ${tpl.name}`,
      industry: s.industry ?? null,
      description: s.description ?? tpl.description,
      videoGoal: s.videoGoal ?? null,
      demoType: s.demoType ?? "COMMERCIAL",
      duration: s.duration ?? "SEC_60",
    },
  });
  redirect(`/projects/${project.id}`);
}
