// Acceso centralizado y validado a las variables de entorno.
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(16, "JWT_SECRET debe tener al menos 16 caracteres"),
  JWT_EXPIRES_IN: z.string().default("7d"),

  GEMINI_API_KEY: z.string().optional().default(""),
  GEMINI_MODEL: z.string().default("gemini-1.5-flash"),

  STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
  STORAGE_LOCAL_DIR: z.string().default("storage/uploads"),

  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().default("us-east-1"),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_FORCE_PATH_STYLE: z
    .string()
    .optional()
    .transform((v) => v === "true"),

  NEXT_PUBLIC_APP_URL: z.string().default("http://localhost:3000"),
});

// En build, algunas variables pueden no existir; parse seguro con defaults.
const parsed = envSchema.safeParse(process.env);

if (!parsed.success && process.env.NODE_ENV !== "production") {
  console.warn(
    "[env] Variables de entorno incompletas:",
    parsed.error.flatten().fieldErrors,
  );
}

export const env = (parsed.success
  ? parsed.data
  : (process.env as unknown)) as z.infer<typeof envSchema>;

export const isGeminiConfigured = () => Boolean(env.GEMINI_API_KEY);
