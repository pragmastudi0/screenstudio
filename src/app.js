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
  selectedSegId: null,
  subs: [], // {start, end, text}
  blobUrl: null,
  duration: 0,

  settings: {
    autozoom: true,
    sensitivity: "med",
    zoom: 2.0,
    hold: 1.8,
    clickFx: true,
    cursor: "hand", // hand | spotlight | off
    padding: 0.06,
    radius: 14,
    bg: "#111114",
    exportFmt: "mp4",
    subsOn: false,
    subStyle: "highlight",
    subSize: 0.05,
    subPos: "bottom",
    subColor: "#ffffff",
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
// Presets de "cantidad de zooms": cuanto más grandes los gaps, menos zooms
// (se agrupan y fusionan más clicks en un solo movimiento de cámara).
const SENSITIVITY = {
  low: { clusterGap: 3.5, mergeGap: 2.5 },
  med: { clusterGap: 2.2, mergeGap: 1.2 },
  high: { clusterGap: 1.2, mergeGap: 0.4 },
};
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
  S.recordedBlob = new Blob(S.chunks, { type: "video/webm" });
  await loadVideoBlob(S.recordedBlob);
  S.segments = buildSegments(S.clicks, SENSITIVITY[S.settings.sensitivity]);
  S.subs = [];
  enterEditor();
}

async function loadVideoBlob(blob) {
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
}

function enterEditor() {
  ensureAudioGraph();
  S.selectedSegId = null;
  $("scrub").value = 0;
  recomputeZoom();
  buildTimeline();
  renderSubsList();
  applySettingsToUI();
  updateSegPanel();
  hide("view-setup");
  hide("view-recording");
  show("view-editor");
  drawAt(0);
}

// Vuelca S.settings a los controles (útil al abrir un proyecto guardado).
function applySettingsToUI() {
  const s = S.settings;
  $("edAutozoom").checked = s.autozoom;
  $("sensitivity").value = s.sensitivity;
  $("zoomRange").value = Math.round(s.zoom * 100);
  $("zoomVal").textContent = `${s.zoom.toFixed(1)}×`;
  $("holdRange").value = Math.round(s.hold * 100);
  $("holdVal").textContent = `${s.hold.toFixed(1)}s`;
  $("edClickFx").checked = s.clickFx;
  $("cursorStyle").value = s.cursor;
  $("padRange").value = Math.round(s.padding * 100);
  $("padVal").textContent = `${Math.round(s.padding * 100)}%`;
  $("radRange").value = s.radius;
  $("radVal").textContent = `${s.radius}px`;
  $("exportFmt").value = s.exportFmt;
  $("subsOn").checked = s.subsOn;
  $("subsControls").style.display = s.subsOn ? "" : "none";
  $("subStyle").value = s.subStyle;
  $("subSize").value = Math.round(s.subSize * 100);
  $("subSizeVal").textContent = `${Math.round(s.subSize * 100)}%`;
  $("subPos").value = s.subPos;
  document.querySelectorAll("#swatches .sw").forEach((el) =>
    el.classList.toggle("sel", el.dataset.c === s.bg),
  );
  document.querySelectorAll("#subColors .sw").forEach((el) =>
    el.classList.toggle("sel", el.dataset.c === s.subColor),
  );
}

// ── Subtítulos ──
function generateSubtitles() {
  const text = $("subsText").value.trim();
  if (!text || !S.duration) {
    showToast("Escribe el guion y graba primero.");
    return;
  }
  const words = text.replace(/\s+/g, " ").split(" ");
  const chunks = [];
  let cur = [];
  for (const w of words) {
    cur.push(w);
    const endsSentence = /[.!?…]$/.test(w);
    if (cur.length >= 8 || (endsSentence && cur.length >= 4)) {
      chunks.push(cur.join(" "));
      cur = [];
    }
  }
  if (cur.length) chunks.push(cur.join(" "));

  const totalWords = chunks.reduce((a, c) => a + c.split(" ").length, 0) || 1;
  let t = 0;
  S.subs = chunks.map((c) => {
    const dur = (c.split(" ").length / totalWords) * S.duration;
    const cue = { start: t, end: Math.min(S.duration, t + dur), text: c };
    t += dur;
    return cue;
  });
  renderSubsList();
  if (!S.playing) drawAt(video.currentTime);
}

function renderSubsList() {
  const box = $("subsList");
  if (!box) return;
  box.innerHTML = "";
  S.subs.forEach((cue, i) => {
    const row = document.createElement("div");
    row.className = "subrow";
    const input = document.createElement("input");
    input.value = cue.text;
    input.oninput = (e) => {
      cue.text = e.target.value;
      if (!S.playing) drawAt(video.currentTime);
    };
    const tm = document.createElement("span");
    tm.className = "tm";
    tm.textContent = fmt(cue.start);
    const x = document.createElement("span");
    x.className = "x";
    x.textContent = "✕";
    x.onclick = () => {
      S.subs.splice(i, 1);
      renderSubsList();
      if (!S.playing) drawAt(video.currentTime);
    };
    row.append(tm, input, x);
    box.appendChild(row);
  });
}

// ── Proyectos (.pss) ──
async function saveProjectFn() {
  if (!S.recordedBlob) {
    showToast("No hay grabación para guardar.");
    return;
  }
  const state = {
    version: 1,
    duration: S.duration,
    clicks: S.clicks,
    moves: S.moves,
    segments: S.segments,
    subs: S.subs,
    settings: S.settings,
  };
  const buf = new Uint8Array(await S.recordedBlob.arrayBuffer());
  const r = await window.studio.saveProject({
    state,
    video: buf,
    suggested: `proyecto-${Date.now()}.pss`,
  });
  if (r.saved) showToast("Proyecto guardado ✓", true);
  else if (r.error) showToast(`No se pudo guardar: ${r.error}`);
}

async function openProjectFn() {
  const r = await window.studio.openProject();
  if (!r.opened) {
    if (r.error) showToast(`No se pudo abrir: ${r.error}`);
    return;
  }
  const st = r.state;
  S.clicks = st.clicks || [];
  S.moves = st.moves || [];
  S.segments = st.segments || [];
  S.subs = st.subs || [];
  S.settings = Object.assign(S.settings, st.settings || {});
  S.recordedBlob = new Blob([new Uint8Array(r.video)], { type: "video/webm" });
  await loadVideoBlob(S.recordedBlob);
  S.duration = st.duration || S.duration;
  enterEditor();
  showToast("Proyecto cargado ✓", true);
}

function showToast(msg, ok) {
  const el = $("toast");
  el.textContent = msg;
  el.className = "toast" + (ok ? " ok" : "");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => el.classList.add("hidden"), 3600);
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

  // Subtítulos por encima de todo (no recortados por el zoom).
  if (cfg.subsOn) drawSubtitle(ctx, W, H, t);
}

function drawSubtitle(ctx, W, H, t) {
  const cue = S.subs.find((s) => t >= s.start && t < s.end);
  if (!cue || !cue.text.trim()) return;
  const cfg = S.settings;
  const fontSize = Math.round(H * cfg.subSize);
  ctx.save();
  ctx.font = `700 ${fontSize}px -apple-system,"Segoe UI",Roboto,sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  // Ajuste de líneas al 80% del ancho.
  const maxW = W * 0.8;
  const words = cue.text.trim().split(/\s+/);
  const lines = [];
  let line = "";
  for (const w of words) {
    const test = line ? line + " " + w : w;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);

  const lh = fontSize * 1.25;
  const blockH = lines.length * lh;
  let topY;
  if (cfg.subPos === "top") topY = H * 0.08;
  else if (cfg.subPos === "middle") topY = (H - blockH) / 2;
  else topY = H - blockH - H * 0.07;

  lines.forEach((ln, i) => {
    const cx = W / 2;
    const baseY = topY + i * lh + fontSize;
    const tw = ctx.measureText(ln).width;
    const padX = fontSize * 0.4;
    const padY = fontSize * 0.18;

    if (cfg.subStyle === "classic") {
      ctx.fillStyle = "rgba(0,0,0,0.7)";
      roundRect(ctx, cx - tw / 2 - padX, baseY - fontSize - padY, tw + padX * 2, lh, fontSize * 0.18);
      ctx.fill();
      ctx.fillStyle = cfg.subColor;
      ctx.fillText(ln, cx, baseY);
    } else if (cfg.subStyle === "highlight") {
      ctx.fillStyle = "rgba(139,92,246,0.92)";
      roundRect(ctx, cx - tw / 2 - padX, baseY - fontSize - padY, tw + padX * 2, lh, fontSize * 0.22);
      ctx.fill();
      ctx.fillStyle = cfg.subColor;
      ctx.fillText(ln, cx, baseY);
    } else if (cfg.subStyle === "outline") {
      ctx.lineWidth = fontSize * 0.14;
      ctx.strokeStyle = "rgba(0,0,0,0.9)";
      ctx.lineJoin = "round";
      ctx.strokeText(ln, cx, baseY);
      ctx.fillStyle = cfg.subColor;
      ctx.fillText(ln, cx, baseY);
    } else {
      // bold con sombra
      ctx.shadowColor = "rgba(0,0,0,0.75)";
      ctx.shadowBlur = fontSize * 0.3;
      ctx.shadowOffsetY = fontSize * 0.06;
      ctx.fillStyle = cfg.subColor;
      ctx.fillText(ln, cx, baseY);
    }
  });
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
    chip.className =
      "chip" + (seg.enabled ? "" : " off") + (seg.id === S.selectedSegId ? " sel" : "");
    chip.innerHTML = `<span><b>Zoom ${i + 1}</b> · ${fmt(seg.start)}</span><span class="x" title="Eliminar">✕</span>`;
    chip.querySelector("span").onclick = () => selectSegment(seg.id);
    chip.querySelector(".x").onclick = (ev) => {
      ev.stopPropagation();
      deleteSegment(seg.id);
    };
    list.appendChild(chip);
  });

  const active = S.segments.filter((s) => s.enabled).length;
  $("clickCount").textContent = `${S.clicks.length} clicks · ${active} zoom${active === 1 ? "" : "s"}`;
}

function selectedSeg() {
  return S.segments.find((s) => s.id === S.selectedSegId) || null;
}

function selectSegment(id) {
  S.selectedSegId = id;
  buildTimeline();
  updateSegPanel();
}

function deleteSegment(id) {
  S.segments = S.segments.filter((s) => s.id !== id);
  if (S.selectedSegId === id) S.selectedSegId = null;
  recomputeZoom();
  buildTimeline();
  updateSegPanel();
  if (!S.playing) drawAt(video.currentTime);
}

function updateSegPanel() {
  const seg = selectedSeg();
  const panel = $("segPanel");
  if (!seg) {
    panel.style.display = "none";
    return;
  }
  panel.style.display = "";
  const idx = S.segments.indexOf(seg) + 1;
  const hold = seg.hold != null ? seg.hold : S.settings.hold;
  $("segTitle").textContent = `#${idx}`;
  $("segHold").value = Math.round(hold * 100);
  $("segHoldVal").textContent = `${hold.toFixed(1)}s`;
  $("segToggle").textContent = seg.enabled ? "Desactivar" : "Activar";
}

// Recalcula los zooms desde los clicks con la sensibilidad elegida.
// (Reinicia ajustes manuales de zooms: añadidos/eliminados.)
function rebuildSegments() {
  S.segments = buildSegments(S.clicks, SENSITIVITY[S.settings.sensitivity]);
  S.selectedSegId = null;
  recomputeZoom();
  buildTimeline();
  updateSegPanel();
  if (!S.playing) drawAt(video.currentTime);
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
function setProgress(pct, label, sub) {
  $("expBar").style.width = `${pct}%`;
  $("expPct").textContent = `${Math.round(pct)}%`;
  if (label) $("expLabel").textContent = label;
  if (sub != null) $("expSub").textContent = sub;
}

async function exportVideo() {
  if (S.exporting) return;
  S.exporting = true;
  stopPlayback();
  show("exporting");
  setProgress(0, "Renderizando video…", "se renderiza en tiempo real");

  if (S.audioCtx && S.audioCtx.state === "suspended") await S.audioCtx.resume();

  // Silencia los altavoces durante el export (sin cortar el audio grabado).
  let muted = false;
  if (S.mediaSrcNode && S.audioCtx) {
    try {
      S.mediaSrcNode.disconnect(S.audioCtx.destination);
      muted = true;
    } catch {}
  }

  // Siempre se graba WebM (códec fiable); luego ffmpeg lo pasa a MP4/MOV.
  const mime = pickRecordMime();
  const canvasStream = $("preview").captureStream(30);
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
      setProgress(Math.min(99, (video.currentTime / S.duration) * 100));
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

  // Restaura el audio a los altavoces.
  if (muted) {
    try {
      S.mediaSrcNode.connect(S.audioCtx.destination);
    } catch {}
  }

  const fmt = S.settings.exportFmt; // mp4 | mov | webm
  if (fmt !== "webm") setProgress(100, `Convirtiendo a ${fmt.toUpperCase()}…`, "casi listo");

  const blob = new Blob(chunks, { type: "video/webm" });
  const buffer = await blob.arrayBuffer();
  const r = await window.studio.saveVideo({
    buffer: new Uint8Array(buffer),
    suggested: `pragmascreenstudio-${Date.now()}.${fmt}`,
    format: fmt,
  });

  hide("exporting");
  S.exporting = false;
  if (r.saved) showToast(r.note ? `⚠ ${r.note}` : `Guardado: ${r.path}`, !r.note);
  else if (r.error) showToast(`No se pudo convertir: ${r.error}`);
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
  $("sensitivity").onchange = (e) => {
    S.settings.sensitivity = e.target.value;
    rebuildSegments();
  };
  $("exportFmt").onchange = (e) => (S.settings.exportFmt = e.target.value);

  link("zoomRange", (v) => { S.settings.zoom = v / 100; $("zoomVal").textContent = `${(v / 100).toFixed(1)}×`; recomputeZoom(); });
  link("holdRange", (v) => { S.settings.hold = v / 100; $("holdVal").textContent = `${(v / 100).toFixed(1)}s`; recomputeZoom(); buildTimeline(); });
  link("padRange", (v) => { S.settings.padding = v / 100; $("padVal").textContent = `${v}%`; });
  link("radRange", (v) => { S.settings.radius = v; $("radVal").textContent = `${v}px`; });

  // Paletas de color (fondo y subtítulos). Cada grupo es independiente.
  const buildSwatches = (containerId, colors, getSel, setSel) => {
    const wrap = $(containerId);
    colors.forEach((c) => {
      const b = document.createElement("div");
      b.className = "sw" + (c === getSel() ? " sel" : "");
      b.style.background = c;
      b.dataset.c = c;
      b.onclick = () => {
        wrap.querySelectorAll(".sw").forEach((x) => x.classList.remove("sel"));
        b.classList.add("sel");
        setSel(c);
        if (!S.playing) drawAt(video.currentTime);
      };
      wrap.appendChild(b);
    });
  };
  buildSwatches("swatches", ["#111114", "#000000", "#1e1b4b", "#0f766e", "#7c3aed", "#f1f5f9"],
    () => S.settings.bg, (c) => (S.settings.bg = c));
  buildSwatches("subColors", ["#ffffff", "#facc15", "#22d3ee", "#a78bfa", "#000000"],
    () => S.settings.subColor, (c) => (S.settings.subColor = c));

  // Per-zoom: duración, activar/desactivar y eliminar.
  $("segHold").oninput = (e) => {
    const seg = selectedSeg();
    if (!seg) return;
    seg.hold = +e.target.value / 100;
    $("segHoldVal").textContent = `${seg.hold.toFixed(1)}s`;
    recomputeZoom();
    buildTimeline();
    if (!S.playing) drawAt(video.currentTime);
  };
  $("segToggle").onclick = () => {
    const seg = selectedSeg();
    if (!seg) return;
    seg.enabled = !seg.enabled;
    recomputeZoom();
    buildTimeline();
    updateSegPanel();
    if (!S.playing) drawAt(video.currentTime);
  };
  $("segDelete").onclick = () => S.selectedSegId && deleteSegment(S.selectedSegId);

  // Subtítulos.
  $("subsOn").onchange = (e) => {
    S.settings.subsOn = e.target.checked;
    $("subsControls").style.display = e.target.checked ? "" : "none";
    if (!S.playing) drawAt(video.currentTime);
  };
  $("subsGen").onclick = generateSubtitles;
  $("subStyle").onchange = (e) => { S.settings.subStyle = e.target.value; if (!S.playing) drawAt(video.currentTime); };
  $("subPos").onchange = (e) => { S.settings.subPos = e.target.value; if (!S.playing) drawAt(video.currentTime); };
  link("subSize", (v) => { S.settings.subSize = v / 100; $("subSizeVal").textContent = `${v}%`; });

  // Proyectos.
  $("saveProject").onclick = saveProjectFn;
  $("openProject").onclick = openProjectFn;

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
