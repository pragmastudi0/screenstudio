import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2, "Nombre demasiado corto").max(80),
  email: z.string().email("Email no válido"),
  password: z.string().min(8, "Mínimo 8 caracteres"),
});

export const loginSchema = z.object({
  email: z.string().email("Email no válido"),
  password: z.string().min(1, "Introduce tu contraseña"),
});

export const projectSchema = z.object({
  softwareName: z.string().min(2, "Indica el nombre del software").max(120),
  client: z.string().max(120).optional().or(z.literal("")),
  industry: z.string().max(120).optional().or(z.literal("")),
  description: z.string().max(4000).optional().or(z.literal("")),
  systemUrl: z.string().url("URL no válida").optional().or(z.literal("")),
  videoGoal: z.string().max(2000).optional().or(z.literal("")),
  demoType: z.enum(["COMMERCIAL", "ONBOARDING", "TRAINING", "LAUNCH"]),
  duration: z.enum(["SEC_30", "SEC_60", "MIN_3", "MIN_5"]),
});

export type ProjectInput = z.infer<typeof projectSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
