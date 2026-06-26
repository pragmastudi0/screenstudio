// ─────────────────────────────────────────────────────────────
// ScreenStudio — Proceso principal de Electron
// Crea la ventana, expone fuentes de captura y rastrea el mouse global
// (clicks) para el zoom automático. Durante la grabación minimiza la
// ventana para que NO aparezca en el video y registra un atajo global
// para detener.
// ─────────────────────────────────────────────────────────────
const {
  app,
  BrowserWindow,
  ipcMain,
  desktopCapturer,
  screen,
  dialog,
  globalShortcut,
} = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");
const { spawn } = require("child_process");

// ffmpeg embebido (para exportar MP4/MOV reales, compatibles con WhatsApp).
let ffmpegPath = null;
try {
  ffmpegPath = require("ffmpeg-static");
  // En la app empaquetada el binario está fuera del asar.
  if (ffmpegPath) ffmpegPath = ffmpegPath.replace("app.asar", "app.asar.unpacked");
} catch (e) {
  console.error("[main] ffmpeg-static no disponible:", e.message);
}

let mainWindow = null;

// uiohook-napi captura el mouse a nivel de sistema operativo.
// Requiere permiso de Accesibilidad en macOS.
let uIOhook = null;
try {
  uIOhook = require("uiohook-napi").uIOhook;
} catch (e) {
  console.error("[main] No se pudo cargar uiohook-napi:", e.message);
}

const STOP_SHORTCUT = "CommandOrControl+Shift+2";

let tracking = false;
let lastMove = 0;
// bounds lógicos (puntos) de la pantalla primaria; sirven para normalizar la
// posición del cursor a 0..1 sin importar el factor Retina.
let bounds = { x: 0, y: 0, width: 1920, height: 1080 };

function refreshDisplayMetrics() {
  bounds = screen.getPrimaryDisplay().bounds;
}

// Posición del cursor (0..1) usando la API de Electron, que devuelve puntos
// lógicos consistentes (evita la ambigüedad de coordenadas de uiohook).
function cursorNorm() {
  const p = screen.getCursorScreenPoint();
  const clamp = (v) => Math.max(0, Math.min(1, v));
  return {
    nx: clamp((p.x - bounds.x) / bounds.width),
    ny: clamp((p.y - bounds.y) / bounds.height),
  };
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 780,
    minWidth: 920,
    minHeight: 640,
    backgroundColor: "#0a0a0c",
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  mainWindow.loadFile(path.join(__dirname, "..", "src", "index.html"));
  if (process.argv.includes("--dev")) mainWindow.webContents.openDevTools({ mode: "detach" });
}

// ── Hook global del mouse (solo clicks) ──
function setupMouseHook() {
  if (!uIOhook) return;

  uIOhook.on("mousedown", () => {
    if (!tracking || !mainWindow) return;
    const { nx, ny } = cursorNorm();
    mainWindow.webContents.send("mouse-event", { type: "down", nx, ny, t: Date.now() });
  });

  // Movimiento del cursor (para dibujar el cursor "manito" en el editor).
  uIOhook.on("mousemove", () => {
    if (!tracking || !mainWindow) return;
    const now = Date.now();
    if (now - lastMove < 33) return; // ~30 fps
    lastMove = now;
    const { nx, ny } = cursorNorm();
    mainWindow.webContents.send("mouse-event", { type: "move", nx, ny, t: now });
  });

  try {
    uIOhook.start();
  } catch (e) {
    console.error("[main] uIOhook.start falló:", e.message);
  }
}

// ── IPC ──
ipcMain.handle("get-sources", async () => {
  const sources = await desktopCapturer.getSources({
    types: ["screen", "window"],
    thumbnailSize: { width: 320, height: 200 },
    fetchWindowIcons: true,
  });
  return sources.map((s) => ({
    id: s.id,
    name: s.name,
    thumbnail: s.thumbnail.toDataURL(),
    icon: s.appIcon && !s.appIcon.isEmpty() ? s.appIcon.toDataURL() : null,
    isScreen: s.id.startsWith("screen"),
  }));
});

ipcMain.handle("get-display", () => {
  const d = screen.getPrimaryDisplay();
  return { width: d.size.width, height: d.size.height, scaleFactor: d.scaleFactor };
});

// Comienza la captura: refresca métricas, activa el hook, minimiza la
// ventana (para que no salga en el video) y registra el atajo de detener.
ipcMain.on("start-capture", () => {
  refreshDisplayMetrics();
  tracking = true;
  if (mainWindow) mainWindow.minimize();
  globalShortcut.register(STOP_SHORTCUT, () => {
    if (mainWindow) mainWindow.webContents.send("global-stop");
  });
});

// Termina la captura: desactiva hook, libera atajo y restaura la ventana.
ipcMain.on("stop-capture", () => {
  tracking = false;
  globalShortcut.unregister(STOP_SHORTCUT);
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
});

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    if (!ffmpegPath) return reject(new Error("ffmpeg no disponible"));
    const proc = spawn(ffmpegPath, args);
    let err = "";
    proc.stderr.on("data", (d) => (err += d.toString()));
    proc.on("error", reject);
    proc.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error("ffmpeg falló: " + err.slice(-400))),
    );
  });
}

// Convierte un WebM a MP4/MOV (H.264 + AAC, +faststart). Dimensiones pares.
function transcode(inputPath, outputPath) {
  return runFfmpeg([
    "-y", "-i", inputPath,
    "-c:v", "libx264", "-preset", "veryfast", "-pix_fmt", "yuv420p",
    "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2",
    "-crf", "20", "-c:a", "aac", "-b:a", "160k",
    "-movflags", "+faststart",
    outputPath,
  ]);
}

// Extrae el audio (voz en off) a MP3 mono para la transcripción.
function extractAudio(inputPath, outputPath) {
  return runFfmpeg(["-y", "-i", inputPath, "-vn", "-ac", "1", "-ar", "16000", "-b:a", "64k", outputPath]);
}

// ── Config persistente (API key de Gemini) ──
function configPath() {
  return path.join(app.getPath("userData"), "config.json");
}
function readConfig() {
  try {
    return JSON.parse(fs.readFileSync(configPath(), "utf8"));
  } catch {
    return {};
  }
}
function writeConfig(c) {
  try {
    fs.writeFileSync(configPath(), JSON.stringify(c));
  } catch {}
}

function cleanJson(text) {
  const c = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  try {
    return JSON.parse(c);
  } catch {
    const m = c.match(/\[[\s\S]*\]/);
    if (m) return JSON.parse(m[0]);
    throw new Error("respuesta IA no es JSON");
  }
}

// Transcribe el audio con Gemini (API gratuita) y devuelve cues con tiempos.
async function geminiTranscribe(apiKey, audioBase64) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  const prompt =
    "Transcribe este audio en su idioma original. Devuelve EXCLUSIVAMENTE un array JSON " +
    'de objetos {"start": number, "end": number, "text": string}, donde start y end son ' +
    "segundos desde el inicio del audio y cada text es una línea corta de subtítulo " +
    "(máximo 8 palabras). No agregues explicaciones ni nada fuera del JSON.";
  const body = {
    contents: [
      { parts: [{ inline_data: { mime_type: "audio/mp3", data: audioBase64 } }, { text: prompt }] },
    ],
    generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
  };
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Gemini ${res.status}: ${t.slice(0, 200)}`);
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  return cleanJson(text);
}

// format: "webm" (directo) | "mp4" | "mov" (transcodifica con ffmpeg).
ipcMain.handle("save-video", async (_e, { buffer, suggested, format }) => {
  const fmt = format || "webm";
  const filters =
    fmt === "mp4"
      ? [{ name: "Video MP4", extensions: ["mp4"] }]
      : fmt === "mov"
        ? [{ name: "Video MOV", extensions: ["mov"] }]
        : [{ name: "Video WebM", extensions: ["webm"] }];
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: "Guardar video",
    defaultPath: suggested || `screenstudio.${fmt}`,
    filters,
  });
  if (canceled || !filePath) return { saved: false };

  if (fmt === "webm") {
    fs.writeFileSync(filePath, Buffer.from(buffer));
    return { saved: true, path: filePath };
  }

  // Si ffmpeg no está disponible, guarda el WebM en lugar de fallar.
  if (!ffmpegPath) {
    const alt = filePath.replace(/\.(mp4|mov)$/i, ".webm");
    fs.writeFileSync(alt, Buffer.from(buffer));
    return { saved: true, path: alt, note: "ffmpeg no disponible: guardado como WebM. Ejecuta 'npm install'." };
  }

  // Escribe el WebM temporal y transcodifica al destino MP4/MOV.
  const tmp = path.join(os.tmpdir(), `pss-${Date.now()}.webm`);
  try {
    fs.writeFileSync(tmp, Buffer.from(buffer));
    await transcode(tmp, filePath);
    return { saved: true, path: filePath };
  } catch (e) {
    // Último recurso: deja el WebM junto al destino.
    const alt = filePath.replace(/\.(mp4|mov)$/i, ".webm");
    try {
      fs.writeFileSync(alt, Buffer.from(buffer));
      return { saved: true, path: alt, note: "Falló la conversión; guardado como WebM. " + e.message };
    } catch {
      return { saved: false, error: e.message };
    }
  } finally {
    fs.rmSync(tmp, { force: true });
  }
});

// ── Transcripción automática con Gemini ──
ipcMain.handle("get-api-key", () => readConfig().geminiKey || "");

ipcMain.handle("transcribe", async (_e, { video, apiKey }) => {
  try {
    if (apiKey) {
      const c = readConfig();
      c.geminiKey = apiKey;
      writeConfig(c);
    }
    const key = apiKey || readConfig().geminiKey;
    if (!key) return { ok: false, error: "Falta la API key de Gemini" };
    if (!ffmpegPath) return { ok: false, error: "ffmpeg no disponible; ejecuta npm install" };

    const stamp = Date.now();
    const tmpV = path.join(os.tmpdir(), `pss-${stamp}.webm`);
    const tmpA = path.join(os.tmpdir(), `pss-${stamp}.mp3`);
    try {
      fs.writeFileSync(tmpV, Buffer.from(video));
      await extractAudio(tmpV, tmpA);
      const b64 = fs.readFileSync(tmpA).toString("base64");
      const cues = await geminiTranscribe(key, b64);
      return { ok: true, cues };
    } finally {
      fs.rmSync(tmpV, { force: true });
      fs.rmSync(tmpA, { force: true });
    }
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

// ── Proyectos (.pss + .webm) para seguir editando luego ──
ipcMain.handle("save-project", async (_e, { state, video, suggested }) => {
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: "Guardar proyecto",
    defaultPath: suggested || "proyecto.pss",
    filters: [{ name: "Proyecto PragmaScreenStudio", extensions: ["pss"] }],
  });
  if (canceled || !filePath) return { saved: false };
  const base = filePath.replace(/\.pss$/i, "");
  const videoFile = path.basename(base) + ".webm";
  try {
    fs.writeFileSync(base + ".webm", Buffer.from(video));
    fs.writeFileSync(filePath, JSON.stringify({ ...state, videoFile }, null, 0));
    return { saved: true, path: filePath };
  } catch (e) {
    return { saved: false, error: e.message };
  }
});

ipcMain.handle("open-project", async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: "Abrir proyecto",
    properties: ["openFile"],
    filters: [{ name: "Proyecto PragmaScreenStudio", extensions: ["pss"] }],
  });
  if (canceled || !filePaths[0]) return { opened: false };
  try {
    const state = JSON.parse(fs.readFileSync(filePaths[0], "utf8"));
    const dir = path.dirname(filePaths[0]);
    const videoPath = path.join(dir, state.videoFile);
    const video = fs.readFileSync(videoPath);
    return { opened: true, state, video };
  } catch (e) {
    return { opened: false, error: e.message };
  }
});

app.whenReady().then(() => {
  refreshDisplayMetrics();
  setupMouseHook();
  createWindow();
  screen.on("display-metrics-changed", refreshDisplayMetrics);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
  if (uIOhook) {
    try {
      uIOhook.stop();
    } catch {}
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
