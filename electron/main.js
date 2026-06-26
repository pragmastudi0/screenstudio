// ─────────────────────────────────────────────────────────────
// ScreenStudio — Proceso principal de Electron
// Crea la ventana, expone fuentes de captura y rastrea el mouse global
// (clicks y movimiento) para el zoom automático.
// ─────────────────────────────────────────────────────────────
const {
  app,
  BrowserWindow,
  ipcMain,
  desktopCapturer,
  screen,
  dialog,
} = require("electron");
const path = require("path");
const fs = require("fs");

let mainWindow = null;

// uiohook-napi captura el mouse/teclado a nivel de sistema operativo.
// Requiere permiso de Accesibilidad en macOS.
let uIOhook = null;
try {
  uIOhook = require("uiohook-napi").uIOhook;
} catch (e) {
  console.error("[main] No se pudo cargar uiohook-napi:", e.message);
}

let tracking = false;
let lastMove = 0;
let physical = { w: 1920, h: 1080 };

function refreshDisplayMetrics() {
  const d = screen.getPrimaryDisplay();
  physical = {
    w: d.size.width * d.scaleFactor,
    h: d.size.height * d.scaleFactor,
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

// ── Hook global del mouse ──
function setupMouseHook() {
  if (!uIOhook) return;

  const clamp = (v) => Math.max(0, Math.min(1, v));

  uIOhook.on("mousedown", (e) => {
    if (!tracking || !mainWindow) return;
    mainWindow.webContents.send("mouse-event", {
      type: "down",
      nx: clamp(e.x / physical.w),
      ny: clamp(e.y / physical.h),
      t: Date.now(),
    });
  });

  uIOhook.on("mousemove", (e) => {
    if (!tracking || !mainWindow) return;
    const now = Date.now();
    if (now - lastMove < 33) return; // ~30 fps
    lastMove = now;
    mainWindow.webContents.send("mouse-event", {
      type: "move",
      nx: clamp(e.x / physical.w),
      ny: clamp(e.y / physical.h),
      t: now,
    });
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
    fetchWindowIcons: false,
  });
  return sources.map((s) => ({
    id: s.id,
    name: s.name,
    thumbnail: s.thumbnail.toDataURL(),
    isScreen: s.id.startsWith("screen"),
  }));
});

ipcMain.handle("get-display", () => {
  const d = screen.getPrimaryDisplay();
  return { width: d.size.width, height: d.size.height, scaleFactor: d.scaleFactor };
});

ipcMain.on("tracking", (_e, on) => {
  refreshDisplayMetrics();
  tracking = !!on;
});

ipcMain.handle("save-video", async (_e, { buffer, suggested }) => {
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: "Guardar video",
    defaultPath: suggested || "screenstudio.webm",
    filters: [{ name: "Video WebM", extensions: ["webm"] }],
  });
  if (canceled || !filePath) return { saved: false };
  fs.writeFileSync(filePath, Buffer.from(buffer));
  return { saved: true, path: filePath };
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

app.on("window-all-closed", () => {
  if (uIOhook) {
    try {
      uIOhook.stop();
    } catch {}
  }
  if (process.platform !== "darwin") app.quit();
});
