// Etiquetas y opciones compartidas entre UI, Server Actions e IA.
import type {
  DemoType,
  Duration,
  AssetKind,
  SceneStatus,
  PromptTarget,
  PromptKind,
  VoiceVariant,
  TemplateCategory,
  ProjectStatus,
} from "@prisma/client";

export const DEMO_TYPES: { value: DemoType; label: string; hint: string }[] = [
  { value: "COMMERCIAL", label: "Demo comercial", hint: "Vender el producto a prospectos" },
  { value: "ONBOARDING", label: "Demo onboarding", hint: "Activar a nuevos clientes" },
  { value: "TRAINING", label: "Demo capacitación", hint: "Formar a usuarios internos" },
  { value: "LAUNCH", label: "Demo lanzamiento", hint: "Anunciar una nueva versión" },
];

export const DURATIONS: { value: Duration; label: string; seconds: number }[] = [
  { value: "SEC_30", label: "30 segundos", seconds: 30 },
  { value: "SEC_60", label: "60 segundos", seconds: 60 },
  { value: "MIN_3", label: "3 minutos", seconds: 180 },
  { value: "MIN_5", label: "5 minutos", seconds: 300 },
];

export const ASSET_KINDS: Record<AssetKind, string> = {
  IMAGE: "Imagen",
  SCREENSHOT: "Screenshot",
  PDF: "PDF",
  MANUAL: "Manual",
  VIDEO: "Video",
};

export const SCENE_STATUSES: { value: SceneStatus; label: string; color: string }[] = [
  { value: "TODO", label: "Por hacer", color: "bg-zinc-500" },
  { value: "IN_PROGRESS", label: "En progreso", color: "bg-blue-500" },
  { value: "RECORDED", label: "Grabada", color: "bg-amber-500" },
  { value: "DONE", label: "Lista", color: "bg-emerald-500" },
];

export const PROJECT_STATUSES: Record<ProjectStatus, { label: string; color: string }> = {
  DRAFT: { label: "Borrador", color: "bg-zinc-500" },
  ANALYZING: { label: "Analizando", color: "bg-blue-500" },
  GENERATING: { label: "Generando", color: "bg-violet-500" },
  READY: { label: "Listo", color: "bg-emerald-500" },
  ARCHIVED: { label: "Archivado", color: "bg-zinc-700" },
};

export const PROMPT_TARGETS: {
  value: PromptTarget;
  label: string;
  kind: PromptKind;
  description: string;
}[] = [
  { value: "VEO", label: "Google Veo", kind: "VIDEO", description: "Video generativo cinematográfico" },
  { value: "KLING", label: "Kling", kind: "VIDEO", description: "Video generativo con movimiento realista" },
  { value: "RUNWAY", label: "Runway", kind: "VIDEO", description: "Video generativo Gen-3" },
  { value: "MIDJOURNEY", label: "Midjourney", kind: "IMAGE", description: "Imágenes de alta calidad" },
  { value: "CHATGPT", label: "ChatGPT", kind: "TEXT", description: "Refinar guion o copy" },
  { value: "CLAUDE", label: "Claude", kind: "TEXT", description: "Refinar guion o estructura" },
];

export const VOICE_VARIANTS: { value: VoiceVariant; label: string; tone: string }[] = [
  { value: "FORMAL", label: "Formal", tone: "serio, preciso, profesional" },
  { value: "COMMERCIAL", label: "Comercial", tone: "persuasivo, enérgico, orientado a venta" },
  { value: "CORPORATE", label: "Corporativo", tone: "institucional, confiable, sobrio" },
  { value: "EMOTIONAL", label: "Emocional", tone: "cercano, inspirador, humano" },
];

export const TEMPLATE_CATEGORIES: Record<TemplateCategory, string> = {
  ERP: "ERP",
  CRM: "CRM",
  LOGISTICS: "Logística",
  FINANCE: "Finanzas",
  HR: "RRHH",
  ECOMMERCE: "E-commerce",
  SAAS: "SaaS",
  AI: "IA",
};

// Tipos de archivo aceptados en la subida de capturas.
export const ACCEPTED_MIME: Record<string, AssetKind> = {
  "image/png": "SCREENSHOT",
  "image/jpeg": "IMAGE",
  "image/webp": "IMAGE",
  "image/gif": "IMAGE",
  "application/pdf": "PDF",
  "video/mp4": "VIDEO",
  "video/webm": "VIDEO",
  "video/quicktime": "VIDEO",
};

export const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB
