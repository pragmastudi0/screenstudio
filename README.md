# ScreenStudio 🎥

App de escritorio (Electron) para **grabar tu pantalla con zoom automático hacia donde haces click**, resaltar los clicks, grabar **voz en off** y exportar el video desde un **editor** integrado. Pensada para crear demos de software de forma rápida y profesional — estilo *Screen Studio*.

## ✨ Qué hace

- 🖥️ **Graba pantalla completa o una ventana** (elige la fuente).
- 🔍 **Zoom automático al hacer click**: rastrea el mouse a nivel de sistema y, al editar, acerca la imagen suavemente hacia cada click.
- 🟣 **Resalta los clicks** con un pulso animado.
- 🎙️ **Voz en off**: graba tu micrófono junto con la pantalla.
- 🎬 **Editor**: ajusta intensidad/duración del zoom, padding, esquinas redondeadas y color de fondo; previsualiza en vivo.
- ⤓ **Exporta** a video WebM (render en tiempo real con el zoom y los efectos aplicados).

## 🧱 Stack

- **Electron** (app de escritorio multiplataforma)
- **uiohook-napi** — captura global de mouse (clicks/movimiento) para el zoom automático
- **Web APIs**: `desktopCapturer` + `getUserMedia` (captura), `MediaRecorder` (grabación), `Canvas` + `captureStream` (render/export), `WebAudio` (mux de la voz)
- Sin frameworks pesados en la interfaz: HTML + CSS + JS modular

## 🚀 Cómo correrlo

> Requiere **Node.js 20+**. Probado para macOS y Windows.

```bash
npm install
npm start
```

Se abre la ventana de ScreenStudio:

1. **Elige** qué grabar (pantalla o ventana).
2. Marca si quieres **micrófono**, **zoom automático** y **resaltar clicks**.
3. Pulsa **● Empezar a grabar** y usa tu software normalmente.
4. **■ Detener** → se abre el **editor**.
5. Ajusta zoom/fondo, previsualiza y pulsa **⤓ Exportar video**.

### 🔐 Permisos (macOS) — importante

La primera vez, macOS pedirá permisos. Conцédelos en
**Configuración del Sistema → Privacidad y seguridad**:

- **Grabación de pantalla** → activa ScreenStudio (para capturar la pantalla).
- **Accesibilidad** → activa ScreenStudio (para el **zoom automático**: leer los clicks globales).
- **Micrófono** → para la voz en off.

Después de concederlos, **reinicia la app**.

## 📦 Empaquetar (instalable)

```bash
npm run dist:mac     # genera un .dmg (macOS)
npm run dist:win     # genera un instalador .exe (Windows)
```

Los artefactos quedan en `dist/`.

## 📂 Estructura

```
screenstudio/
├── electron/
│   ├── main.js        # proceso principal: ventana, fuentes, hook global del mouse
│   └── preload.js     # puente seguro (contextBridge)
├── src/
│   ├── index.html     # interfaz (setup · grabación · editor)
│   ├── styles.css
│   ├── app.js         # grabación, editor, render y export
│   └── zoom.js        # motor de zoom (clicks → keyframes → interpolación)
└── package.json
```

## 🛠️ Notas técnicas

- El **zoom no se aplica en vivo** durante la grabación: se graba la pantalla "plana" y el zoom/efectos se aplican en el editor y al exportar. Así la grabación es ligera y todo es reeditable.
- Las coordenadas del mouse se normalizan (0–1) respecto a la pantalla, por lo que el zoom apunta al lugar correcto sin importar la resolución/Retina.
- La exportación renderiza en un `<canvas>` y graba su `captureStream` + la pista de audio (voz) vía WebAudio → archivo **WebM**. Para MP4 puedes convertir con `ffmpeg -i in.webm out.mp4`.

## 🗺️ Roadmap

- [ ] Recortar inicio/fin en la línea de tiempo
- [ ] Editar/borrar zooms individualmente (arrastrar keyframes)
- [ ] Cursor suavizado y oculto el real (cursor "virtual")
- [ ] Cámara webcam en círculo (picture-in-picture)
- [ ] Fondos con degradado/wallpaper e imágenes
- [ ] Export MP4 nativo (ffmpeg embebido)
- [ ] Atajos de teclado para marcar zooms manualmente

---

Hecho como MVP funcional y ampliable.
