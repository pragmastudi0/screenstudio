import {
  buildSegments,
  makeManualSegment,
  segmentsToKeyframes,
  sampleZoom,
  samplePath,
} from "./zoom.js";

// ───────────────────────── Estado ─────────────────────────
const S = {
  sourceId: null,
  isScreen: true,
  display: { width: 1920, height: 1080, scaleFactor: 1 },
  recorder: null,
  chunks: [],
  stream: null,
  micStream: null,
  recordStart: 0,
  timer: null,
  unhook: null,
  unstop: null,

  clicks: [], // {t, x, y}
  moves: [], // {t, x, y}
  segments: [], // zooms editables
  blobUrl: null,
  duration: 0,

  settings: {
    autozoom: true,
    zoom: 2.0,
    hold: 1.8,
    clickFx: true,
    cursor: "hand", // hand | spotlight | off
    padding: 0.06,
    radius: 14,
    bg: "#111114",
    exportFmt: "mp4",
  },
  keyframes: [],

  playing: false,
  raf: null,
  audioCtx: null,
  audioDest: null,
  mediaSrcNode: null,
  exporting: false,
};

const LEAD = 0.25;
const $ = (id) => document.getElementById(id);
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const show = (id) => $(id).classList.remove("hidden");
const hide = (id) => $(id).classList.add("hidden");
const isMac = navigator.platform.toUpperCase().includes("MAC");

const video = document.createElement("video");
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
    const icon = s.icon
      ? `<img class="ico" src="${s.icon}" alt="">`
      : `<span class="ico-emoji">${s.isScreen ? "🖥️" : "🪟"}</span>`;
    el.innerHTML = `<img class="thumb" src="${s.thumbnail}" alt=""><div class="cap">${icon}<span class="cap-txt">${s.name}</span></div>`;
    el.onclick = () => {
      document.querySelectorAll(".src").forEach((x) => x.classList.remove("sel"));
      el.classList.add("sel");
      S.sourceId = s.id;
      S.isScreen = s.isScreen;
      $("startBtn").disabled = false;
    };
    wrap.appendChild(el);
  }
}

// ───────────────────────── Grabar ─────────────────────────
function pickRecordMime() {
  const opts = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
  return opts.find((m) => MediaRecorder.isTypeSupported(m)) || "video/webm";
}

function pickExportMime(fmt) {
  if (fmt === "mp4") {
    const cands = [
      "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
      "video/mp4;codecs=h264,aac",
      "video/mp4",
    ];
    const m = cands.find((c) => MediaRecorder.isTypeSupported(c));
    if (m) return { mime: m, ext: "mp4" };
  }
  const webm = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"].find(
    (c) => MediaRecorder.isTypeSupported(c),
  ) || "video/webm";
  return { mime: webm, ext: "webm" };
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

    S.micStream = null;
    if ($("optMic").checked) {
      try {
        S.micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch {
        toastWarn("No se pudo acceder al micrófono. Se grabará sin voz.");
      }
    }
    S.settings.autozoom = $("optAutozoom").checked;
    S.settings.clickFx = $("optClickFx").checked;

    await runCountdown(3);
    beginCapture();
  } catch (err) {
    console.error(err);
    showPermWarning(err);
  }
}

function runCountdown(n) {
  return new Promise((resolve) => {
    $("countNum").textContent = n;
    show("countdown");
    let left = n;
    const id = setInterval(() => {
      left -= 1;
      if (left <= 0) {
        clearInterval(id);
        hide("countdown");
        resolve();
      } else {
        $("countNum").textContent = left;
      }
    }, 1000);
  });
}

function beginCapture() {
  window.studio.startCapture(); // minimiza la ventana + atajo global

  const tracks = [...S.stream.getVideoTracks()];
  if (S.micStream) tracks.push(...S.micStream.getAudioTracks());
  const combined = new MediaStream(tracks);

  S.chunks = [];
  S.recorder = new MediaRecorder(combined, { mimeType: pickRecordMime(), videoBitsPerSecond: 8_000_000 });
  S.recorder.ondataavailable = (e) => e.data.size && S.chunks.push(e.data);
  S.recorder.onstop = onRecordingStopped;

  setTimeout(() => {
    S.recorder.start();
    S.recordStart = Date.now();
    S.clicks = [];
    S.moves = [];
    S.unhook = window.studio.onMouseEvent((e) => {
      const t = (e.t - S.recordStart) / 1000;
      if (e.type === "down") S.clicks.push({ t, x: e.nx, y: e.ny });
      else if (e.type === "move") S.moves.push({ t, x: e.nx, y: e.ny });
    });
    hide("view-setup");
    show("view-recording");
    S.timer = setInterval(() => {
      $("recTime").textContent = fmt((Date.now() - S.recordStart) / 1000);
    }, 250);
  }, 350);

  S.stream.getVideoTracks()[0].onended = () => stopRecording();
}

function stopRecording() {
  if (!S.recorder) return;
  if (S.unhook) S.unhook();
  clearInterval(S.timer);
  window.studio.stopCapture();
  if (S.recorder.state !== "inactive") S.recorder.stop();
  [S.stream, S.micStream].forEach((st) => st && st.getTracks().forEach((t) => t.stop()));
}

async function onRecordingStopped() {
  const blob = new Blob(S.chunks, { type: "video/webm" });
  if (S.blobUrl) URL.revokeObjectURL(S.blobUrl);
  S.blobUrl = URL.createObjectURL(blob);
  video.src = S.blobUrl;
  await once(video, "loadedmetadata");
  S.duration = await resolveDuration(video);

  const canvas = $("preview");
  let ow = video.videoWidth || 1280;
  let oh = video.videoHeight || 720;
  if (ow > 1920) {
    oh = Math.round((oh * 1920) / ow);
    ow = 1920;
  }
  canvas.width = ow;
  canvas.height = oh;

  S.segments = buildSegments(S.clicks);
  ensureAudioGraph();
  recomputeZoom();
  buildTimeline();
  $("clickCount").textContent = `${S.clicks.length} clicks · ${S.segments.length} zooms`;
  $("scrub").value = 0;

  hide("view-recording");
  show("view-editor");
  drawAt(0);
}

// ───────────────────────── Editor / render ─────────────────────────
function recomputeZoom() {
  S.keyframes = S.settings.autozoom
    ? segmentsToKeyframes(S.segments, { zoom: S.settings.zoom, hold: S.settings.hold, lead: LEAD })
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

  const toCanvas = (nx, ny) => ({ x: ix + dx + nx * dw, y: iy + dy + ny * dh });

  // Resalte del click (anillo que se expande).
  if (cfg.clickFx) {
    for (const c of S.clicks) {
      const age = t - c.t;
      if (age < 0 || age > 0.6) continue;
      const p = age / 0.6;
      const { x: px, y: py } = toCanvas(c.x, c.y);
      ctx.beginPath();
      ctx.arc(px, py, 8 + p * 40, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(139,92,246,${1 - p})`;
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  }

  // Cursor (manito / resaltado).
  if (cfg.cursor !== "off") {
    const cur = samplePath(S.moves, t) || (S.clicks.length ? nearestClick(t) : null);
    if (cur) {
      const { x: px, y: py } = toCanvas(cur.x, cur.y);
      const pressed = S.clicks.some((c) => t - c.t >= 0 && t - c.t < 0.18);
      drawCursor(ctx, px, py, Math.min(W, H), cfg.cursor, pressed);
    }
  }
  ctx.restore();
}

function nearestClick(t) {
  let best = null;
  let bd = Infinity;
  for (const c of S.clicks) {
    const d = Math.abs(c.t - t);
    if (d < bd) {
      bd = d;
      best = c;
    }
  }
  return best;
}

function drawCursor(ctx, px, py, ref, style, pressed) {
  if (style === "spotlight") {
    const r = ref * 0.07;
    const g = ctx.createRadialGradient(px, py, r * 0.2, px, py, r);
    g.addColorStop(0, "rgba(255,255,255,0.28)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(px, py, pressed ? r * 0.32 : r * 0.42, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(139,92,246,0.9)";
    ctx.lineWidth = 3;
    ctx.stroke();
    return;
  }
  // Manito 👆 — la punta del dedo apunta al lugar exacto.
  const size = Math.max(28, ref * 0.06) * (pressed ? 0.86 : 1);
  ctx.save();
  ctx.font = `${size}px "Apple Color Emoji","Segoe UI Emoji",sans-serif`;
  ctx.textBaseline = "top";
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = 8;
  ctx.fillText("👆", px - size * 0.28, py - size * 0.06);
  ctx.restore();
}

function loop() {
  if (!S.playing) return;
  drawAt(video.currentTime);
  $("scrub").value = Math.round((video.currentTime / S.duration) * 1000) || 0;
  $("tlabel").textContent = fmt(video.currentTime);
  if (video.ended) {
    stopPlayback();
    return;
  }
  S.raf = requestAnimationFrame(loop);
}

async function startPlayback() {
  if (S.audioCtx && S.audioCtx.state === "suspended") await S.audioCtx.resume();
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

// Línea de tiempo: marcas de click, zonas de zoom y chips para editar/eliminar.
function buildTimeline() {
  const tl = $("timeline");
  const list = $("zoomlist");
  tl.innerHTML = "";
  list.innerHTML = "";
  if (!S.duration) return;

  for (const c of S.clicks) {
    const tick = document.createElement("div");
    tick.className = "tick";
    tick.style.left = `${(c.t / S.duration) * 100}%`;
    tl.appendChild(tick);
  }

  S.segments.forEach((seg, i) => {
    const start = Math.max(0, seg.start - LEAD);
    const end = Math.min(S.duration, seg.end + S.settings.hold);
    if (seg.enabled) {
      const zone = document.createElement("div");
      zone.className = "zone";
      zone.style.left = `${(start / S.duration) * 100}%`;
      zone.style.width = `${Math.max(1.5, ((end - start) / S.duration) * 100)}%`;
      zone.title = `Zoom ${i + 1}`;
      tl.appendChild(zone);
    }

    const chip = document.createElement("div");
    chip.className = "chip" + (seg.enabled ? "" : " off");
    chip.innerHTML = `<span><b>Zoom ${i + 1}</b> · ${fmt(seg.start)}</span><span class="x" title="Eliminar">✕</span>`;
    chip.querySelector("span").onclick = () => {
      seg.enabled = !seg.enabled;
      recomputeZoom();
      buildTimeline();
      if (!S.playing) drawAt(video.currentTime);
    };
    chip.querySelector(".x").onclick = (ev) => {
      ev.stopPropagation();
      S.segments = S.segments.filter((s) => s.id !== seg.id);
      recomputeZoom();
      buildTimeline();
      if (!S.playing) drawAt(video.currentTime);
    };
    list.appendChild(chip);
  });
}

function addZoomAtPlayhead() {
  const t = video.currentTime;
  // Centra el zoom en el cursor de ese instante, o en el centro.
  const cur = samplePath(S.moves, t) || { x: 0.5, y: 0.5 };
  S.segments.push(makeManualSegment(t, cur.x, cur.y));
  S.segments.sort((a, b) => a.start - b.start);
  recomputeZoom();
  buildTimeline();
  if (!S.playing) drawAt(t);
}

// ───────────────────────── Audio ─────────────────────────
function ensureAudioGraph() {
  if (S.mediaSrcNode) return;
  try {
    S.audioCtx = new AudioContext();
    S.audioDest = S.audioCtx.createMediaStreamDestination();
    S.mediaSrcNode = S.audioCtx.createMediaElementSource(video);
    S.mediaSrcNode.connect(S.audioDest);
    S.mediaSrcNode.connect(S.audioCtx.destination);
  } catch (e) {
    console.warn("[audio] no se pudo crear el grafo:", e.message);
  }
}

// ───────────────────────── Exportar ─────────────────────────
async function exportVideo() {
  if (S.exporting) return;
  S.exporting = true;
  stopPlayback();
  show("exporting");
  $("expPct").textContent = "0%";

  if (S.audioCtx && S.audioCtx.state === "suspended") await S.audioCtx.resume();

  const { mime, ext } = pickExportMime(S.settings.exportFmt);
  if (S.settings.exportFmt === "mp4" && ext !== "mp4") {
    toastWarn("Tu versión no soporta MP4; se exporta WebM. Convierte con: ffmpeg -i in.webm out.mp4");
  }

  const canvas = $("preview");
  const canvasStream = canvas.captureStream(30);
  const audioTracks = S.audioDest ? S.audioDest.stream.getAudioTracks() : [];
  const out = new MediaStream([...canvasStream.getVideoTracks(), ...audioTracks]);

  const chunks = [];
  const rec = new MediaRecorder(out, { mimeType: mime, videoBitsPerSecond: 10_000_000 });
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const done = new Promise((res) => (rec.onstop = res));
  rec.start();

  video.currentTime = 0;
  await video.play().catch(() => {});

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
  video.pause();

  const blob = new Blob(chunks, { type: mime });
  const buffer = await blob.arrayBuffer();
  const r = await window.studio.saveVideo({
    buffer: new Uint8Array(buffer),
    suggested: `pragmascreenstudio-${Date.now()}.${ext}`,
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

// ───────────────────────── Controles ─────────────────────────
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
  $("addZoom").onclick = addZoomAtPlayhead;

  $("scrub").oninput = (e) => {
    const t = (e.target.value / 1000) * S.duration;
    video.currentTime = t;
    drawAt(t);
    $("tlabel").textContent = fmt(t);
  };

  const link = (id, fn) =>
    ($(id).oninput = (e) => {
      fn(+e.target.value);
      if (!S.playing) drawAt(video.currentTime);
    });

  $("edAutozoom").onchange = (e) => {
    S.settings.autozoom = e.target.checked;
    recomputeZoom();
    if (!S.playing) drawAt(video.currentTime);
  };
  $("edClickFx").onchange = (e) => {
    S.settings.clickFx = e.target.checked;
    if (!S.playing) drawAt(video.currentTime);
  };
  $("cursorStyle").onchange = (e) => {
    S.settings.cursor = e.target.value;
    if (!S.playing) drawAt(video.currentTime);
  };
  $("exportFmt").onchange = (e) => (S.settings.exportFmt = e.target.value);

  link("zoomRange", (v) => { S.settings.zoom = v / 100; $("zoomVal").textContent = `${(v / 100).toFixed(1)}×`; recomputeZoom(); });
  link("holdRange", (v) => { S.settings.hold = v / 100; $("holdVal").textContent = `${(v / 100).toFixed(1)}s`; recomputeZoom(); buildTimeline(); });
  link("padRange", (v) => { S.settings.padding = v / 100; $("padVal").textContent = `${v}%`; });
  link("radRange", (v) => { S.settings.radius = v; $("radVal").textContent = `${v}px`; });

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

  S.unstop = window.studio.onGlobalStop(() => {
    if (!$("view-recording").classList.contains("hidden")) stopRecording();
  });

  window.addEventListener("keydown", (e) => {
    if ($("view-editor").classList.contains("hidden")) return;
    if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT") return;
    if (e.code === "Space") {
      e.preventDefault();
      S.playing ? stopPlayback() : startPlayback();
    }
  });

  $("stopHint").textContent = isMac ? "⌘⇧2" : "Ctrl+Shift+2";
}

document.body.classList.toggle("mac", isMac);
bindControls();
loadSources();
