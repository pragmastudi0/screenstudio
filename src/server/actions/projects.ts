"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { projectSchema } from "@/lib/validations";

function clean<T extends Record<string, unknown>>(obj: T) {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [k, v === "" ? null : v]),
  );
}

export async function createProjectAction(formData: FormData) {
  const session = await requireUser();
  const parsed = projectSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.errors[0]?.message ?? "Datos no válidos" };
  }

  const project = await prisma.project.create({
    data: { ...(clean(parsed.data) as object), userId: session.userId } as never,
  });
  revalidatePath("/projects");
  redirect(`/projects/${project.id}`);
}

export async function updateProjectAction(projectId: string, formData: FormData) {
  const session = await requireUser();
  const parsed = projectSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.errors[0]?.message ?? "Datos no válidos" };
  }
  await prisma.project.update({
    where: { id: projectId, userId: session.userId },
    data: clean(parsed.data) as never,
  });
  revalidatePath(`/projects/${projectId}`);
  return { ok: true as const };
}

export async function deleteProjectAction(projectId: string) {
  const session = await requireUser();
  await prisma.project.delete({
    where: { id: projectId, userId: session.userId },
  });
  revalidatePath("/projects");
  redirect("/projects");
}

export async function listProjects() {
  const session = await requireUser();
  return prisma.project.findMany({
    where: { userId: session.userId },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { assets: true, scenes: true } } },
  });
}
