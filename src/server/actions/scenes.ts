"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import type { SceneStatus } from "@prisma/client";

async function assertSceneOwner(sceneId: string, userId: string) {
  const scene = await prisma.scene.findFirst({
    where: { id: sceneId, project: { userId } },
  });
  if (!scene) throw new Error("SCENE_NOT_FOUND");
  return scene;
}

// Módulo 6 — mover una escena entre columnas del Kanban.
export async function updateSceneStatusAction(sceneId: string, status: SceneStatus) {
  const session = await requireUser();
  const scene = await assertSceneOwner(sceneId, session.userId);
  await prisma.scene.update({ where: { id: sceneId }, data: { status } });
  revalidatePath(`/projects/${scene.projectId}`);
  return { ok: true as const };
}

export async function updateSceneAction(
  sceneId: string,
  data: Partial<{
    title: string;
    description: string;
    narration: string;
    onScreenText: string;
    requiredAction: string;
  }>,
) {
  const session = await requireUser();
  const scene = await assertSceneOwner(sceneId, session.userId);
  await prisma.scene.update({ where: { id: sceneId }, data });
  revalidatePath(`/projects/${scene.projectId}`);
  return { ok: true as const };
}
