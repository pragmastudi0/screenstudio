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

// Convierte un WebM a MP4/MOV (H.264 + AAC, +faststart) con ffmpeg.
function transcode(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    if (!ffmpegPath) return reject(new Error("ffmpeg no disponible"));
    const args = [
      "-y",
      "-i", inputPath,
      "-c:v", "libx264",
      "-preset", "veryfast",
      "-pix_fmt", "yuv420p",
      "-crf", "20",
      "-c:a", "aac",
      "-b:a", "160k",
      "-movflags", "+faststart",
      outputPath,
    ];
    const proc = spawn(ffmpegPath, args);
    let err = "";
    proc.stderr.on("data", (d) => (err += d.toString()));
    proc.on("error", reject);
    proc.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error("ffmpeg falló: " + err.slice(-400))),
    );
  });
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

  // Escribe el WebM temporal y transcodifica al destino MP4/MOV.
  const tmp = path.join(os.tmpdir(), `pss-${Date.now()}.webm`);
  try {
    fs.writeFileSync(tmp, Buffer.from(buffer));
    await transcode(tmp, filePath);
    return { saved: true, path: filePath };
  } catch (e) {
    return { saved: false, error: e.message };
  } finally {
    fs.rmSync(tmp, { force: true });
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
