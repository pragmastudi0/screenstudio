-- ─────────────────────────────────────────────────────────────
-- Demo Generator AI — Esquema SQL (PostgreSQL)
-- Equivalente al schema.prisma. Útil como referencia o para crear
-- la base de datos sin Prisma. Prisma gestiona normalmente esto vía
-- `prisma db push` / `prisma migrate`.
-- ─────────────────────────────────────────────────────────────

-- Enums
CREATE TYPE "DemoType"       AS ENUM ('COMMERCIAL','ONBOARDING','TRAINING','LAUNCH');
CREATE TYPE "Duration"       AS ENUM ('SEC_30','SEC_60','MIN_3','MIN_5');
CREATE TYPE "ProjectStatus"  AS ENUM ('DRAFT','ANALYZING','GENERATING','READY','ARCHIVED');
CREATE TYPE "AssetKind"      AS ENUM ('IMAGE','SCREENSHOT','PDF','MANUAL','VIDEO');
CREATE TYPE "SceneStatus"    AS ENUM ('TODO','IN_PROGRESS','RECORDED','DONE');
CREATE TYPE "PromptTarget"   AS ENUM ('VEO','KLING','RUNWAY','MIDJOURNEY','CHATGPT','CLAUDE');
CREATE TYPE "PromptKind"     AS ENUM ('VIDEO','IMAGE','TEXT');
CREATE TYPE "VoiceVariant"   AS ENUM ('FORMAL','COMMERCIAL','CORPORATE','EMOTIONAL');
CREATE TYPE "TemplateCategory" AS ENUM ('ERP','CRM','LOGISTICS','FINANCE','HR','ECOMMERCE','SAAS','AI');

-- Usuarios
CREATE TABLE "users" (
  "id"           TEXT PRIMARY KEY,
  "email"        TEXT UNIQUE NOT NULL,
  "name"         TEXT,
  "passwordHash" TEXT NOT NULL,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL
);

-- Proyectos (Módulo 1)
CREATE TABLE "projects" (
  "id"           TEXT PRIMARY KEY,
  "userId"       TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "softwareName" TEXT NOT NULL,
  "client"       TEXT,
  "industry"     TEXT,
  "description"  TEXT,
  "systemUrl"    TEXT,
  "videoGoal"    TEXT,
  "demoType"     "DemoType" NOT NULL DEFAULT 'COMMERCIAL',
  "duration"     "Duration" NOT NULL DEFAULT 'SEC_60',
  "status"       "ProjectStatus" NOT NULL DEFAULT 'DRAFT',
  "analysis"     JSONB,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL
);
CREATE INDEX "projects_userId_idx" ON "projects"("userId");

-- Capturas / material (Módulo 2)
CREATE TABLE "assets" (
  "id"           TEXT PRIMARY KEY,
  "projectId"    TEXT NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "kind"         "AssetKind" NOT NULL,
  "originalName" TEXT NOT NULL,
  "storageKey"   TEXT NOT NULL,
  "mimeType"     TEXT NOT NULL,
  "size"         INTEGER NOT NULL,
  "analysis"     JSONB,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "assets_projectId_idx" ON "assets"("projectId");

-- Paquete generado por IA (Módulo 3) — 1:1 con projects
CREATE TABLE "generations" (
  "id"               TEXT PRIMARY KEY,
  "projectId"        TEXT UNIQUE NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "model"            TEXT NOT NULL,
  "executiveSummary" TEXT,
  "valueProposition" TEXT,
  "narrationScript"  TEXT,
  "ctaFinal"         TEXT,
  "storyboard"       JSONB,
  "onScreenTexts"    JSONB,
  "recordingList"    JSONB,
  "videoPrompts"     JSONB,
  "imagePrompts"     JSONB,
  "raw"              JSONB,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL
);

-- Escenas / Kanban (Módulo 6)
CREATE TABLE "scenes" (
  "id"             TEXT PRIMARY KEY,
  "projectId"      TEXT NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "order"          INTEGER NOT NULL,
  "title"          TEXT NOT NULL,
  "description"    TEXT,
  "narration"      TEXT,
  "onScreenText"   TEXT,
  "requiredAction" TEXT,
  "status"         "SceneStatus" NOT NULL DEFAULT 'TODO',
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL
);
CREATE INDEX "scenes_projectId_idx" ON "scenes"("projectId");

-- Prompts por modelo (Módulo 4)
CREATE TABLE "prompts" (
  "id"        TEXT PRIMARY KEY,
  "projectId" TEXT NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "target"    "PromptTarget" NOT NULL,
  "kind"      "PromptKind" NOT NULL,
  "label"     TEXT NOT NULL,
  "content"   TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "prompts_projectId_idx" ON "prompts"("projectId");

-- Voz en off (Módulo 5)
CREATE TABLE "voiceovers" (
  "id"        TEXT PRIMARY KEY,
  "projectId" TEXT NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "variant"   "VoiceVariant" NOT NULL,
  "fullText"  TEXT NOT NULL,
  "segments"  JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "voiceovers_projectId_idx" ON "voiceovers"("projectId");

-- Plantillas (Módulo 8)
CREATE TABLE "templates" (
  "id"          TEXT PRIMARY KEY,
  "name"        TEXT NOT NULL,
  "category"    "TemplateCategory" NOT NULL,
  "description" TEXT NOT NULL,
  "structure"   JSONB NOT NULL,
  "isSystem"    BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
