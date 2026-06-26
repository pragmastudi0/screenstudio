import { buildKeyframes, sampleZoom } from "./zoom.js";

// ───────────────────────── Estado ─────────────────────────
const S = {
  sourceId: null,
  display: { width: 1920, height: 1080, scaleFactor: 1 },
  recorder: null,
  chunks: [],
  stream: null,
  micStream: null,
  recordStart: 0,
  timer: null,
  unhook: null,

  clicks: [], // {t, x, y}
  blobUrl: null,
  duration: 0,

  // ajustes del editor
  settings: {
    autozoom: true,
    zoom: 2.0,
    hold: 1.8,
    clickFx: true,
    padding: 0.06,
    radius: 14,
    bg: "#111114",
  },
  keyframes: [],

  // render
  playing: false,
  raf: null,
  audioCtx: null,
  audioDest: null,
  mediaSrcNode: null,
  exporting: false,
};

const $ = (id) => document.getElementById(id);
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const show = (id) => $(id).classList.remove("hidden");
const hide = (id) => $(id).classList.add("hidden");

const video = document.createElement("video");
video.muted = true;
video.playsInline = true;

// ───────────────────────── Vista 1: fuentes ─────────────────────────
async function loadSources() {
  S.display = await window.studio.getDisplay();
  const sources = await window.studio.getSources();
  const wrap = $("sources");
  wrap.innerHTML = "";
  for (const s of sources) {
    const el = document.createElement("div");
    el.className = "src";
    el.innerHTML = `<img src="${s.thumbnail}" alt=""><div class="cap">${s.isScreen ? "🖥️ " : "🪟 "}${s.name}</div>`;
    el.onclick = () => {
      document.querySelectorAll(".src").forEach((x) => x.classList.remove("sel"));
      el.classList.add("sel");
      S.sourceId = s.id;
      $("startBtn").disabled = false;
    };
    wrap.appendChild(el);
  }
}

// ───────────────────────── Grabar ─────────────────────────
function pickMime() {
  const opts = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
  return opts.find((m) => MediaRecorder.isTypeSupported(m)) || "video/webm";
}

async function startRecording() {
  try {
    const w = S.display.width * S.display.scaleFactor;
    const h = S.display.height * S.display.scaleFactor;
    S.stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        mandatory: {
          chromeMediaSource: "desktop",
          chromeMediaSourceId: S.sourceId,
          maxWidth: w,
          maxHeight: h,
          maxFrameRate: 30,
        },
      },
    });

    const tracks = [...S.stream.getVideoTracks()];
    if ($("optMic").checked) {
      try {
        S.micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        tracks.push(...S.micStream.getAudioTracks());
      } catch {
        toastWarn("No se pudo acceder al micrófono. Se grabará sin voz.");
      }
    }

    const combined = new MediaStream(tracks);
    S.chunks = [];
    S.recorder = new MediaRecorder(combined, { mimeType: pickMime(), videoBitsPerSecond: 8_000_000 });
    S.recorder.ondataavailable = (e) => e.data.size && S.chunks.push(e.data);
    S.recorder.onstop = onRecordingStopped;
    S.recorder.start();
    S.recordStart = Date.now();

    // Rastreo global del mouse para el zoom automático.
    S.clicks = [];
    window.studio.setTracking(true);
    S.unhook = window.studio.onMouseEvent((e) => {
      if (e.type !== "down") return;
      S.clicks.push({ t: (e.t - S.recordStart) / 1000, x: e.nx, y: e.ny });
    });

    hide("view-setup");
    show("view-recording");
    S.timer = setInterval(() => {
      $("recTime").textContent = fmt((Date.now() - S.recordStart) / 1000);
    }, 250);
  } catch (err) {
    console.error(err);
    showPermWarning(err);
  }
}

function stopRecording() {
  window.studio.setTracking(false);
  if (S.unhook) S.unhook();
  clearInterval(S.timer);
  if (S.recorder && S.recorder.state !== "inactive") S.recorder.stop();
  [S.stream, S.micStream].forEach((st) => st && st.getTracks().forEach((t) => t.stop()));
}

async function onRecordingStopped() {
  const blob = new Blob(S.chunks, { type: "video/webm" });
  if (S.blobUrl) URL.revokeObjectURL(S.blobUrl);
  S.blobUrl = URL.createObjectURL(blob);
  video.src = S.blobUrl;
  await once(video, "loadedmetadata");
  S.duration = await resolveDuration(video);

  // Prepara canvas a resolución del video (cap 1920 de ancho).
  const canvas = $("preview");
  let ow = video.videoWidth || 1280;
  let oh = video.videoHeight || 720;
  if (ow > 1920) {
    oh = Math.round((oh * 1920) / ow);
    ow = 1920;
  }
  canvas.width = ow;
  canvas.height = oh;

  recomputeZoom();
  buildTimeline();
  $("clickCount").textContent = `${S.clicks.length} clicks detectados`;
  $("scrub").value = 0;

  hide("view-recording");
  show("view-editor");
  drawAt(0);
}

// ───────────────────────── Editor / render ─────────────────────────
function recomputeZoom() {
  S.keyframes = S.settings.autozoom
    ? buildKeyframes(S.clicks, { zoom: S.settings.zoom, hold: S.settings.hold })
    : [];
}

function roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawAt(t) {
  const canvas = $("preview");
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;
  const cfg = S.settings;

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = cfg.bg;
  ctx.fillRect(0, 0, W, H);

  const margin = Math.round(Math.min(W, H) * cfg.padding);
  const ix = margin;
  const iy = margin;
  const iw = W - 2 * margin;
  const ih = H - 2 * margin;

  const z = cfg.autozoom ? sampleZoom(S.keyframes, t) : { scale: 1, x: 0.5, y: 0.5 };
  const dw = iw * z.scale;
  const dh = ih * z.scale;
  let dx = iw / 2 - z.x * dw;
  let dy = ih / 2 - z.y * dh;
  dx = Math.min(0, Math.max(iw - dw, dx));
  dy = Math.min(0, Math.max(ih - dh, dy));

  ctx.save();
  roundRect(ctx, ix, iy, iw, ih, cfg.radius);
  ctx.clip();
  ctx.drawImage(video, ix + dx, iy + dy, dw, dh);

  if (cfg.clickFx) {
    for (const c of S.clicks) {
      const age = t - c.t;
      if (age < 0 || age > 0.6) continue;
      const p = age / 0.6;
      const px = ix + dx + c.x * dw;
      const py = iy + dy + c.y * dh;
      ctx.beginPath();
      ctx.arc(px, py, 8 + p * 40, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(139,92,246,${1 - p})`;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(px, py, 11, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(139,92,246,${0.45 * (1 - p)})`;
      ctx.fill();
    }
  }
  ctx.restore();
}

function loop() {
  if (!S.playing) return;
  const t = video.currentTime;
  drawAt(t);
  $("scrub").value = Math.round((t / S.duration) * 1000) || 0;
  $("tlabel").textContent = fmt(t);
  if (video.ended) {
    stopPlayback();
    return;
  }
  S.raf = requestAnimationFrame(loop);
}

function startPlayback() {
  S.playing = true;
  $("playBtn").textContent = "❚❚";
  video.play();
  S.raf = requestAnimationFrame(loop);
}
function stopPlayback() {
  S.playing = false;
  $("playBtn").textContent = "▶";
  video.pause();
  cancelAnimationFrame(S.raf);
}

function buildTimeline() {
  const tl = $("timeline");
  tl.innerHTML = "";
  for (const c of S.clicks) {
    const tick = document.createElement("div");
    tick.className = "tick";
    tick.style.left = `${(c.t / S.duration) * 100}%`;
    tl.appendChild(tick);
  }
}

// ───────────────────────── Exportar ─────────────────────────
function ensureAudioGraph() {
  if (S.mediaSrcNode) return;
  S.audioCtx = new AudioContext();
  S.audioDest = S.audioCtx.createMediaStreamDestination();
  S.mediaSrcNode = S.audioCtx.createMediaElementSource(video);
  S.mediaSrcNode.connect(S.audioDest);
  S.mediaSrcNode.connect(S.audioCtx.destination);
}

async function exportVideo() {
  if (S.exporting) return;
  S.exporting = true;
  stopPlayback();
  show("exporting");

  ensureAudioGraph();
  if (S.audioCtx.state === "suspended") await S.audioCtx.resume();

  const canvas = $("preview");
  const canvasStream = canvas.captureStream(30);
  const out = new MediaStream([
    ...canvasStream.getVideoTracks(),
    ...S.audioDest.stream.getAudioTracks(),
  ]);

  const chunks = [];
  const rec = new MediaRecorder(out, { mimeType: pickMime(), videoBitsPerSecond: 10_000_000 });
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);

  const done = new Promise((res) => (rec.onstop = res));
  rec.start();

  video.currentTime = 0;
  video.muted = false;
  await once(video, "seeked").catch(() => {});
  await video.play();

  await new Promise((resolve) => {
    const step = () => {
      drawAt(video.currentTime);
      $("expPct").textContent = `${Math.min(99, Math.round((video.currentTime / S.duration) * 100))}%`;
      if (video.ended || video.currentTime >= S.duration - 0.05) {
        resolve();
        return;
      }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });

  rec.stop();
  await done;
  video.muted = true;
  video.pause();

  const blob = new Blob(chunks, { type: "video/webm" });
  const buffer = await blob.arrayBuffer();
  const r = await window.studio.saveVideo({
    buffer: new Uint8Array(buffer),
    suggested: `screenstudio-${Date.now()}.webm`,
  });

  $("expPct").textContent = "100%";
  hide("exporting");
  S.exporting = false;
  if (r.saved) toastWarn(`Guardado en: ${r.path}`, true);
}

// ───────────────────────── Utilidades ─────────────────────────
function once(el, ev) {
  return new Promise((res, rej) => {
    const ok = () => {
      el.removeEventListener(ev, ok);
      res();
    };
    el.addEventListener(ev, ok, { once: true });
    setTimeout(rej, 5000);
  });
}

// Los WebM de MediaRecorder reportan duración Infinity hasta que se busca.
async function resolveDuration(v) {
  if (Number.isFinite(v.duration) && v.duration > 0) return v.duration;
  return new Promise((resolve) => {
    const onSeek = () => {
      v.currentTime = 0;
      v.removeEventListener("seeked", onSeek);
      resolve(Number.isFinite(v.duration) ? v.duration : 0);
    };
    v.addEventListener("seeked", onSeek);
    v.currentTime = 1e6;
  });
}

function showPermWarning(err) {
  const el = $("permWarn");
  el.classList.remove("hidden");
  el.innerHTML =
    `No se pudo iniciar la grabación (${err?.name || "error"}). ` +
    `En macOS concede permisos en <b>Configuración del Sistema → Privacidad y seguridad → Grabación de pantalla</b> ` +
    `y <b>Accesibilidad</b> (para el zoom automático), luego reinicia ScreenStudio.`;
}

function toastWarn(msg, ok) {
  const el = $("permWarn");
  el.classList.remove("hidden");
  el.style.background = ok ? "#052e16" : "#422006";
  el.style.borderColor = ok ? "#166534" : "#854d0e";
  el.style.color = ok ? "#bbf7d0" : "#fde68a";
  el.textContent = msg;
}

// ───────────────────────── Conexión de controles ─────────────────────────
function bindControls() {
  $("refreshSources").onclick = loadSources;
  $("startBtn").onclick = startRecording;
  $("stopBtn").onclick = stopRecording;
  $("newRec").onclick = () => {
    hide("view-editor");
    show("view-setup");
    loadSources();
  };
  $("exportBtn").onclick = exportVideo;
  $("playBtn").onclick = () => (S.playing ? stopPlayback() : startPlayback());

  $("scrub").oninput = (e) => {
    const t = (e.target.value / 1000) * S.duration;
    video.currentTime = t;
    drawAt(t);
    $("tlabel").textContent = fmt(t);
  };

  const link = (id, fn) => ($(id).oninput = (e) => { fn(+e.target.value); if (!S.playing) drawAt(video.currentTime); });

  $("edAutozoom").onchange = (e) => { S.settings.autozoom = e.target.checked; recomputeZoom(); if (!S.playing) drawAt(video.currentTime); };
  $("edClickFx").onchange = (e) => { S.settings.clickFx = e.target.checked; if (!S.playing) drawAt(video.currentTime); };

  link("zoomRange", (v) => { S.settings.zoom = v / 100; $("zoomVal").textContent = `${(v / 100).toFixed(1)}×`; recomputeZoom(); });
  link("holdRange", (v) => { S.settings.hold = v / 100; $("holdVal").textContent = `${(v / 100).toFixed(1)}s`; recomputeZoom(); });
  link("padRange", (v) => { S.settings.padding = v / 100; $("padVal").textContent = `${v}%`; });
  link("radRange", (v) => { S.settings.radius = v; $("radVal").textContent = `${v}px`; });

  // fondos
  const colors = ["#111114", "#000000", "#1e1b4b", "#0f766e", "#7c3aed", "#f1f5f9"];
  const sw = $("swatches");
  colors.forEach((c, i) => {
    const b = document.createElement("div");
    b.className = "sw" + (i === 0 ? " sel" : "");
    b.style.background = c;
    b.onclick = () => {
      document.querySelectorAll(".sw").forEach((x) => x.classList.remove("sel"));
      b.classList.add("sel");
      S.settings.bg = c;
      if (!S.playing) drawAt(video.currentTime);
    };
    sw.appendChild(b);
  });
}

bindControls();
loadSources();
