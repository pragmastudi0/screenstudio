# Roadmap — Demo Generator AI

## ✅ Fase 0 — MVP (actual)

- Autenticación JWT (registro/login/logout).
- Módulo 1: proyectos (tipo de demo, duración, cliente, industria, objetivo).
- Módulo 2: subida de capturas + análisis IA (funcionalidades, beneficios, casos, módulos).
- Módulo 3: generación completa (resumen, propuesta, guion, storyboard, escenas, textos, CTA, grabaciones, prompts).
- Módulo 4: prompts para Veo, Kling, Runway, Midjourney, ChatGPT, Claude.
- Módulo 5: voz en off (completa + por escena) en 4 tonos.
- Módulo 6: storyboard Kanban con drag & drop.
- Módulo 7: exportación PDF / DOCX / Markdown / JSON.
- Módulo 8: biblioteca de plantillas (8 sectores).
- Almacenamiento local con abstracción S3/MinIO.
- Fallback determinista de IA (funciona sin clave).

## 🔜 Fase 1 — Calidad y colaboración

- [ ] Análisis de **imágenes/screenshots por visión** (Gemini Vision multimodal).
- [ ] Edición inline de escenas en el Kanban (no solo mover).
- [ ] Reordenar escenas (drag vertical) y persistir `order`.
- [ ] Regeneración por bloque (solo guion, solo prompts…).
- [ ] Equipos / espacios de trabajo y roles.
- [ ] Historial de versiones de la generación.

## 🔮 Fase 2 — Almacenamiento y escala

- [ ] Migrar a **MinIO/S3** en producción (`STORAGE_DRIVER=s3`).
- [ ] Subidas directas con URLs prefirmadas.
- [ ] Cola de trabajos (BullMQ + Redis) para generaciones largas.
- [ ] Caché de respuestas IA por proyecto.

## 🤖 Fase 3 — Automatización (Módulo 9)

> La arquitectura ya está preparada. Cada paso es un worker desacoplado.

- [ ] **Captura automática de pantallas** desde `systemUrl` con Playwright.
- [ ] **Generación de video** orquestando los modelos (Veo/Kling/Runway) vía sus APIs.
- [ ] **Generación de voz** con ElevenLabs a partir de `Voiceover.segments`.
- [ ] **Edición/ensamblado** automático (ffmpeg / Remotion) escena por escena.
- [ ] **Publicación** en YouTube (y otros) con la YouTube Data API.
- [ ] Render farm / colas y notificaciones de progreso.

## 🧭 Principios

1. Costo bajo por defecto (plan gratuito de Gemini, todo self-host).
2. Cada módulo del pipeline debe poder ejecutarse y reintentarse de forma aislada.
3. El usuario siempre conserva control: los materiales son editables y exportables.
