"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { storage } from "@/lib/storage";
import { ACCEPTED_MIME, MAX_FILE_SIZE } from "@/lib/constants";
import { extractTextFromAssets } from "@/lib/extract";
import { generateAnalysis } from "@/lib/ai/generate";

async function assertOwner(projectId: string, userId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
  });
  if (!project) throw new Error("PROJECT_NOT_FOUND");
  return project;
}

// Módulo 2 — subida de capturas/material.
export async function uploadAssetsAction(projectId: string, formData: FormData) {
  const session = await requireUser();
  await assertOwner(projectId, session.userId);

  const files = formData.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) return { ok: false as const, error: "No se recibieron archivos" };

  const created: string[] = [];
  for (const file of files) {
    if (file.size > MAX_FILE_SIZE) continue;
    const kind = ACCEPTED_MIME[file.type];
    if (!kind) continue;

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split(".").pop() ?? "bin";
    const key = `${projectId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    await storage().put({ key, body: buffer, contentType: file.type });

    const asset = await prisma.asset.create({
      data: {
        projectId,
        kind,
        originalName: file.name,
        storageKey: key,
        mimeType: file.type,
        size: file.size,
      },
    });
    created.push(asset.id);
  }

  revalidatePath(`/projects/${projectId}`);
  return { ok: true as const, count: created.length };
}

export async function deleteAssetAction(assetId: string) {
  const session = await requireUser();
  const asset = await prisma.asset.findFirst({
    where: { id: assetId, project: { userId: session.userId } },
  });
  if (!asset) return { ok: false as const, error: "No encontrado" };

  await storage().delete(asset.storageKey).catch(() => {});
  await prisma.asset.delete({ where: { id: assetId } });
  revalidatePath(`/projects/${asset.projectId}`);
  return { ok: true as const };
}

// Analiza todo el material del proyecto y guarda funcionalidades/beneficios/etc.
export async function analyzeProjectAction(projectId: string) {
  const session = await requireUser();
  const project = await assertOwner(projectId, session.userId);

  await prisma.project.update({
    where: { id: projectId },
    data: { status: "ANALYZING" },
  });

  const assets = await prisma.asset.findMany({ where: { projectId } });
  const extracted = await extractTextFromAssets(assets);
  const seed = [project.description, project.videoGoal, extracted]
    .filter(Boolean)
    .join("\n\n");

  const analysis = await generateAnalysis({ softwareName: project.softwareName }, seed);

  await prisma.project.update({
    where: { id: projectId },
    data: { analysis: analysis as object, status: "DRAFT" },
  });

  revalidatePath(`/projects/${projectId}`);
  return { ok: true as const, analysis };
}
