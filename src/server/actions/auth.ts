"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  createSession,
  destroySession,
  hashPassword,
  verifyPassword,
} from "@/lib/auth";
import { loginSchema, registerSchema } from "@/lib/validations";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function registerAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Datos no válidos" };
  }

  const { name, email, password } = parsed.data;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { ok: false, error: "Ya existe una cuenta con ese email" };
  }

  const user = await prisma.user.create({
    data: { name, email, passwordHash: await hashPassword(password) },
  });
  await createSession({ userId: user.id, email: user.email, name: user.name });
  redirect("/dashboard");
}

export async function loginAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Datos no válidos" };
  }

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { ok: false, error: "Email o contraseña incorrectos" };
  }

  await createSession({ userId: user.id, email: user.email, name: user.name });
  redirect("/dashboard");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}
