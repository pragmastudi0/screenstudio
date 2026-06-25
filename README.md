# Demo Generator AI

Aplicación SaaS para **generar automáticamente los materiales de un video de demostración de software** (ventas, onboarding y capacitación) usando IA (Google Gemini).

A partir del nombre del software, sus capturas y un objetivo, la app produce: resumen ejecutivo, propuesta de valor, guion narrado, storyboard, escenas, textos en pantalla, CTA, lista de grabaciones, **prompts listos para Veo / Kling / Runway / Midjourney / ChatGPT / Claude** y **voz en off** en 4 tonos. Todo exportable a PDF, DOCX, Markdown y JSON.

> Diseñado para correr **en tu propio Mac Mini**, sin depender de Supabase ni de servicios de pago. PostgreSQL local + almacenamiento local (con ruta de migración a MinIO/S3) + plan gratuito de Gemini.

---

## ✨ Módulos

| # | Módulo | Estado |
|---|--------|--------|
| 1 | Proyectos (software, cliente, industria, objetivo, duración) | ✅ |
| 2 | Capturas (imágenes, screenshots, PDFs, manuales, videos) + análisis IA | ✅ |
| 3 | Generador IA (resumen, propuesta, guion, storyboard, escenas, textos, CTA, grabaciones, prompts) | ✅ |
| 4 | Generador de prompts (Veo, Kling, Runway, Midjourney, ChatGPT, Claude) | ✅ |
| 5 | Voz en off (completa + por escena; formal, comercial, corporativa, emocional) | ✅ |
| 6 | Storyboard visual tipo Kanban | ✅ |
| 7 | Exportación (PDF, Markdown, DOCX, JSON) | ✅ |
| 8 | Biblioteca de plantillas (ERP, CRM, Logística, Finanzas, RRHH, E-commerce, SaaS, IA) | ✅ |
| 9 | Automatización (captura/render/voz/publicación) | 🔜 arquitectura preparada |

---

## 🧱 Stack

- **Frontend:** Next.js 15 (App Router), React 19, TypeScript, TailwindCSS, shadcn/ui
- **Backend:** Next.js Server Actions + API Routes
- **Base de datos:** PostgreSQL + Prisma ORM
- **Auth:** JWT (cookie httpOnly, firmada con `jose`) + bcrypt
- **Almacenamiento:** driver local por defecto, compatible con MinIO/S3
- **IA:** Google Gemini (plan gratuito: `gemini-1.5-flash`), con **fallback determinista** para funcionar sin API key

---

## 🚀 Puesta en marcha (local)

### Requisitos
- Node.js 20+
- Docker (para PostgreSQL y, opcionalmente, MinIO) — o un PostgreSQL propio

### Pasos

```bash
# 1. Dependencias
npm install

# 2. Variables de entorno
cp .env.example .env
#    Edita .env: define JWT_SECRET (openssl rand -base64 48) y, si quieres IA real, GEMINI_API_KEY

# 3. Infraestructura local (PostgreSQL + MinIO)
docker compose up -d

# 4. Base de datos
npm run db:push      # crea las tablas
npm run db:seed      # carga la biblioteca de plantillas

# 5. Arranca
npm run dev
```

Abre <http://localhost:3000>, crea una cuenta y empieza.

> **¿Sin clave de Gemini?** La app funciona igual: usa un generador determinista que produce materiales de ejemplo coherentes. Añade `GEMINI_API_KEY` para resultados reales.

---

## 📂 Estructura de carpetas

```
demo-generator-ai/
├── prisma/
│   ├── schema.prisma        # Modelo de datos
│   └── seed.ts              # Plantillas (Módulo 8)
├── sql/
│   └── schema.sql           # Esquema SQL equivalente
├── docker-compose.yml       # PostgreSQL + MinIO
├── docs/
│   ├── ARCHITECTURE.md      # Arquitectura y flujo de navegación
│   ├── ROADMAP.md           # Roadmap de desarrollo
│   └── DEPLOYMENT-MAC-MINI.md
├── storage/uploads/         # Archivos (driver local)
└── src/
    ├── middleware.ts        # Protección de rutas
    ├── app/
    │   ├── (auth)/          # login, register
    │   ├── (dashboard)/     # dashboard, projects, templates
    │   └── api/             # files, export
    ├── components/
    │   ├── ui/              # primitivas shadcn
    │   ├── auth/  dashboard/  projects/  templates/
    │   └── projects/tabs/   # cada módulo del workspace
    ├── lib/
    │   ├── auth.ts  prisma.ts  env.ts  storage/  ai/  export/
    │   └── constants.ts  validations.ts
    └── server/actions/      # Server Actions (auth, projects, assets, generate, scenes, templates)
```

---

## 🗺️ Flujo de la app

```
Landing → Registro/Login
  → Dashboard
    → Nuevo proyecto (o desde Plantilla)
      → Workspace del proyecto (pestañas):
         Datos · Capturas · Generador IA · Prompts · Voz · Storyboard · Exportar
```

Detalle en [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

---

## 🖥️ Despliegue en Mac Mini

Guía completa (sin Supabase, todo local) en
[`docs/DEPLOYMENT-MAC-MINI.md`](docs/DEPLOYMENT-MAC-MINI.md): PostgreSQL nativo o Docker,
build de producción, `launchd`/PM2 para mantenerlo vivo, y exposición opcional con
Cloudflare Tunnel.

---

## 📜 Scripts

| Script | Acción |
|--------|--------|
| `npm run dev` | Desarrollo |
| `npm run build` | Build de producción (incluye `prisma generate`) |
| `npm run start` | Servidor de producción |
| `npm run db:push` | Sincroniza el esquema con la BD |
| `npm run db:migrate` | Crea una migración |
| `npm run db:seed` | Carga plantillas |
| `npm run db:studio` | Prisma Studio |

---

## 🔐 Seguridad

- Contraseñas con bcrypt; sesión JWT en cookie `httpOnly` `sameSite=lax`.
- Cada Server Action valida la propiedad del recurso (`userId`).
- Los archivos locales se sirven autenticados vía `/api/files/...` comprobando el dueño.

Hecho como MVP listo para producción y ampliable hacia la automatización completa del Módulo 9.
