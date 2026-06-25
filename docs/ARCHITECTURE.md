# Arquitectura — Demo Generator AI

## 1. Visión general

Aplicación monolítica **Next.js 15** (App Router) que combina frontend y backend en
un mismo proceso. Tres capas:

```
┌──────────────────────────────────────────────────────────────┐
│  Cliente (React 19 + shadcn/ui, modo oscuro)                   │
│  - Páginas RSC + islas cliente (forms, kanban, copiar)         │
└───────────────▲───────────────────────────┬───────────────────┘
                │ Server Actions / fetch     │ HTML/JSON
┌───────────────┴───────────────────────────▼───────────────────┐
│  Servidor Next.js                                              │
│  - Server Actions (auth, projects, assets, generate, scenes)   │
│  - API Routes (/api/files, /api/export)                        │
│  - Middleware (protección de rutas)                            │
│  - Capa lib: auth(JWT) · ai(Gemini) · storage · export         │
└───────────────▲───────────────────────────┬───────────────────┘
                │ Prisma                     │ SDK
┌───────────────┴───────────┐   ┌────────────▼───────────────────┐
│  PostgreSQL                │   │  Google Gemini API             │
└────────────────────────────┘   └────────────────────────────────┘
                │
        ┌───────▼────────┐
        │ Almacenamiento │  local (disco) → MinIO/S3 (futuro)
        └────────────────┘
```

## 2. Decisiones clave

- **Server Actions como backend principal:** mutaciones tipadas sin crear endpoints REST.
  Las API Routes se reservan para respuestas binarias (archivos, export) y descargas.
- **Capa de IA con fallback:** `src/lib/ai/` intenta Gemini y, si no hay clave o falla,
  usa generadores deterministas (`fallback.ts`). El MVP siempre funciona end-to-end.
- **Almacenamiento abstraído:** interfaz `StorageDriver` con implementaciones `local` y `s3`.
  Cambiar de disco a MinIO/S3 es solo configuración (`STORAGE_DRIVER`).
- **Auth con `jose` (edge-compatible):** el middleware comprueba presencia de cookie;
  la verificación criptográfica completa ocurre en cada acción/página servidor.
- **Modelo 1:1 Project↔Generation** + tablas hijas (Scene, Prompt, Voiceover) para
  permitir interacción granular (Kanban, copiar prompt individual, variantes de voz).

## 3. Estructura de la capa `lib`

| Carpeta/archivo | Responsabilidad |
|---|---|
| `lib/auth.ts` | Hash de contraseña, firma/verificación JWT, sesión por cookie |
| `lib/prisma.ts` | Cliente Prisma (singleton) |
| `lib/env.ts` | Validación de variables de entorno (zod) |
| `lib/storage/` | Drivers `local` y `s3` + selector |
| `lib/ai/` | `gemini.ts` (cliente), `prompts.ts` (plantillas), `generate.ts` (orquesta), `fallback.ts`, `schemas.ts` (zod) |
| `lib/export/` | `document.ts` (modelo) + `renderers.ts` (md/html/docx/json) |
| `lib/constants.ts` | Etiquetas de enums y opciones compartidas |

## 4. Flujo de generación (Módulos 2→5)

```
1. Crear proyecto (Módulo 1)
2. Subir capturas → uploadAssetsAction → storage.put + Asset
3. Analizar → analyzeProjectAction
     extractTextFromAssets (PDF) → generateAnalysis (Gemini/fallback)
     → guarda Project.analysis {features, benefits, useCases, modules}
4. Generar todo → runGenerationAction (en paralelo):
     generateDemoPackage   → Generation + Scene[]      (Módulos 3, 6)
     generateModelPrompts  → Prompt[]                  (Módulo 4)
     generateVoiceover x4  → Voiceover[]               (Módulo 5)
   Persistencia atómica en una transacción Prisma.
5. Exportar (Módulo 7) → /api/export/[id]?format=pdf|docx|md|json
```

## 5. Flujo de navegación (UI)

```
/                      Landing (redirige a /dashboard si hay sesión)
/login  /register      Autenticación
/dashboard             Métricas + proyectos recientes
/projects              Listado
/projects/new          Alta (Módulo 1)
/projects/[id]         Workspace con pestañas:
                        Datos · Capturas · Generador IA · Prompts ·
                        Voz en off · Storyboard (Kanban) · Exportar
/templates             Biblioteca de plantillas (Módulo 8)
```

## 6. Modelo de datos

Ver `prisma/schema.prisma` y `sql/schema.sql`. Entidades:
`User · Project · Asset · Generation · Scene · Prompt · Voiceover · Template`.

Relaciones: `User 1—N Project`; `Project 1—1 Generation`; `Project 1—N Asset/Scene/Prompt/Voiceover`.
Borrado en cascada desde `Project`.

## 7. Seguridad

- Cookie de sesión `httpOnly`, `sameSite=lax`, `secure` en producción.
- Autorización por recurso: toda acción filtra por `userId`.
- Servido de archivos locales autenticado y verificando propiedad del proyecto.
- Límite de subida 25 MB y allowlist de MIME types.

## 8. Preparado para el Módulo 9 (automatización)

La separación capa-IA / storage / acciones permite añadir, sin reescribir:
- Un **worker de captura** (Playwright) que rellene `Asset` automáticamente desde `systemUrl`.
- Un **pipeline de render** (cola tipo BullMQ) que consuma `Scene[]` + `Prompt[]`.
- **TTS** (ElevenLabs) consumiendo `Voiceover.segments`.
- **Publicación** (YouTube API) tras el render.

Ver [`ROADMAP.md`](ROADMAP.md).
