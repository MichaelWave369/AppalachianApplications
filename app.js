import { TRACKS, STEPS, PRESETS, clonePreset, normalizePattern, stepDuration, advanceStep } from "./music-core.mjs";

const $ = id => document.getElementById(id);
const STORAGE_KEY = "hollercenter-369-pattern-v1";
let pattern = clonePreset("porch-funk");
let muted = TRACKS.map(() => false);
let playing = false;
let context = null;
let master = null;
let noiseBuffer = null;
let interval = null;
let nextTime = 0;
let currentStep = 0;
let generation = 0;
let toastTimer = null;

function tell(message) {
  const el = $("toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2800);
}

function setTransportLabel() {
  $("play-label").textContent = playing ? "HOLD YOUR HORSES!" : "GO ON NOW!";
  $("play-icon").textContent = playing ? "■" : "▶";
  $("play-button").classList.toggle("is-playing", playing);
  $("play-button").setAttribute("aria-pressed", String(playing));
  $("transport-state").textContent = playing ? "The whole holler's bouncin'." : "Everything's sittin' still.";
}

function clearPlayhead() {
  document.querySelectorAll(".step-button.is-current,.step-head.now").forEach(el => el.classList.remove("is-current", "now"));
  $("beat-readout").querySelector("strong").textContent = "01";
}

function markPlayhead(step) {
  clearPlayhead();
  document.querySelectorAll('.step-button[data-step="' + step + '"]').forEach(el => el.classList.add("is-current"));
  const head = document.querySelector('.step-head[data-step="' + step + '"]');
  if (head) head.classList.add("now");
  $("beat-readout").querySelector("strong").textContent = String(step + 1).padStart(2, "0");
}

function renderGrid() {
  const heads = $("steps-header");
  heads.replaceChildren();
  heads.append(document.createElement("span"));
  for (let step = 0; step < STEPS; step++) {
    const h = document.createElement("span");
    h.className = "step-head" + (step % 4 === 0 ? " bar-start" : "");
    h.dataset.step = String(step);
    h.textContent = String(step + 1).padStart(2, "0");
    heads.append(h);
  }
  heads.append(document.createElement("span"));
  const grid = $("track-grid");
  grid.replaceChildren();
  TRACKS.forEach((track, row) => {
    const line = document.createElement("div");
    line.className = "track-row" + (muted[row] ? " is-muted" : "");
    const info = document.createElement("div");
    info.className = "track-info";
    const symbol = document.createElement("span");
    symbol.className = "track-symbol";
    symbol.textContent = track.symbol;
    symbol.setAttribute("aria-hidden", "true");
    const words = document.createElement("div");
    const name = document.createElement("div");
    name.className = "track-name";
    name.textContent = track.name;
    const caption = document.createElement("div");
    caption.className = "track-caption";
    caption.textContent = track.detail;
    words.append(name, caption);
    info.append(symbol, words);
    line.append(info);
    for (let step = 0; step < STEPS; step++) {
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "step-button" + (pattern.grid[row][step] ? " is-on" : "");
      cell.dataset.trackStep = "true";
      cell.dataset.track = String(row);
      cell.dataset.step = String(step);
      cell.setAttribute("aria-label", track.name + ", step " + (step + 1));
      cell.setAttribute("aria-pressed", String(pattern.grid[row][step]));
      cell.addEventListener("click", () => {
        pattern.grid[row][step] = !pattern.grid[row][step];
        cell.classList.toggle("is-on", pattern.grid[row][step]);
        cell.setAttribute("aria-pressed", String(pattern.grid[row][step]));
        markCustom();
      });
      line.append(cell);
    }
    const mute = document.createElement("button");
    mute.type = "button";
    mute.className = "track-mute" + (muted[row] ? " is-muted" : "");
    mute.textContent = "M";
    mute.title = "Mute " + track.name;
    mute.setAttribute("aria-label", "Mute " + track.name);
    mute.setAttribute("aria-pressed", String(muted[row]));
    mute.addEventListener("click", () => {
      muted[row] = !muted[row];
      mute.classList.toggle("is-muted", muted[row]);
      line.classList.toggle("is-muted", muted[row]);
      mute.setAttribute("aria-pressed", String(muted[row]));
    });
    line.append(mute);
    grid.append(line);
  });
}

function markCustom() {
  if (!$("preset").querySelector('option[value="custom"]')) {
    const custom = document.createElement("option");
    custom.value = "custom";
    custom.textContent = "My Holler Groove";
    $("preset").append(custom);
  }
  $("preset").value = "custom";
  pattern.name = "My Holler Groove";
}

function showValues() {
  $("tempo").value = String(pattern.bpm);
  $("tempo-value").textContent = pattern.bpm + " BPM";
  $("swing").value = String(Math.round(pattern.swing * 100));
  $("swing-value").textContent = Math.round(pattern.swing * 100) + "%";
  $("volume-value").textContent = $("volume").value + "%";
}

function loadPattern(value, presetId) {
  pattern = normalizePattern(value);
  muted = TRACKS.map(() => false);
  if (presetId && Object.prototype.hasOwnProperty.call(PRESETS, presetId)) {
    $("preset").value = presetId;
  } else {
    markCustom();
    pattern.name = value.name || "My Holler Groove";
  }
  renderGrid();
  showValues();
}

function audioReady() {
  const ContextClass = window.AudioContext || window.webkitAudioContext;
  if (!ContextClass) throw new Error("Your browser doesn't support Web Audio.");
  if (!context) {
    context = new ContextClass();
    master = context.createGain();
    const limiter = context.createDynamicsCompressor();
    limiter.threshold.value = -12;
    limiter.knee.value = 12;
    limiter.ratio.value = 8;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.2;
    master.gain.value = Number($("volume").value) / 100;
    master.connect(limiter);
    limiter.connect(context.destination);
    noiseBuffer = context.createBuffer(1, Math.floor(context.sampleRate * 0.36), context.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  return context.resume();
}

function envelope(level, time, decay) {
  const gain = context.createGain();
  gain.gain.setValueAtTime(0.001, time);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.001, level), time + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.001, time + decay);
  gain.connect(master);
  return gain;
}

function bootStomp(time) {
  const osc = context.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(150, time);
  osc.frequency.exponentialRampToValueAtTime(48, time + 0.22);
  osc.connect(envelope(0.82, time, 0.28));
  osc.start(time);
  osc.stop(time + 0.30);
}

function whiteNoise(time, frequency, decay, level, filterType) {
  const source = context.createBufferSource();
  source.buffer = noiseBuffer;
  const filter = context.createBiquadFilter();
  filter.type = filterType;
  filter.frequency.value = frequency;
  filter.Q.value = 0.75;
  source.connect(filter);
  filter.connect(envelope(level, time, decay));
  source.start(time);
  source.stop(time + decay + 0.01);
}

function washboard(time) {
  whiteNoise(time, 3800, 0.09, 0.22, "highpass");
}

function porchClap(time) {
  const source = context.createBufferSource();
  source.buffer = noiseBuffer;
  const filter = context.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 1650;
  filter.Q.value = 0.7;
  const gain = context.createGain();
  gain.gain.setValueAtTime(0.001, time);
  for (let i = 0; i < 3; i++) {
    const t = time + i * 0.026;
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.26 - i * 0.05, t + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.024);
  }
  source.connect(filter);
  filter.connect(gain);
  gain.connect(master);
  source.start(time);
  source.stop(time + 0.12);
}

const bassNotes = [65.41, 65.41, 73.42, 82.41, 65.41, 98, 82.41, 73.42];
function jugBass(time, step) {
  const frequency = bassNotes[Math.floor(step / 2) % bassNotes.length];
  const filter = context.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 310;
  filter.Q.value = 0.8;
  const gain = envelope(0.42, time, 0.38);
  filter.connect(gain);
  ["triangle", "sine"].forEach((type, idx) => {
    const osc = context.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency * (idx ? 0.5 : 1), time);
    const level = context.createGain();
    level.gain.value = idx ? 0.3 : 0.7;
    osc.connect(level);
    level.connect(filter);
    osc.start(time);
    osc.stop(time + 0.40);
  });
}

const banjoNotes = [261.63, 329.63, 392, 440, 392, 329.63, 293.66, 261.63];
function banjoPluck(time, frequency, loudness = 0.32) {
  const duration = 0.62;
  const samples = Math.floor(context.sampleRate * duration);
  const delay = Math.max(3, Math.round(context.sampleRate / frequency));
  const buffer = context.createBuffer(1, samples, context.sampleRate);
  const y = buffer.getChannelData(0);
  for (let i = 0; i < delay; i++) y[i] = (Math.random() * 2 - 1) * 0.8;
  for (let i = delay; i < samples; i++) {
    y[i] = 0.995 * 0.5 * (y[i - delay] + y[i - delay + 1]);
  }
  const source = context.createBufferSource();
  source.buffer = buffer;
  const filter = context.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 2800;
  filter.Q.value = 0.5;
  source.connect(filter);
  filter.connect(envelope(loudness, time, 0.58));
  source.start(time);
  source.stop(time + duration);
}

function playInstrument(row, time, step) {
  if (muted[row]) return;
  switch (TRACKS[row].id) {
    case "stomp": bootStomp(time); break;
    case "wash": washboard(time); break;
    case "jug": jugBass(time, step); break;
    case "banjo": banjoPluck(time, banjoNotes[step % banjoNotes.length]); break;
    case "clap": porchClap(time); break;
  }
}

function schedule() {
  if (!playing || !context) return;
  while (nextTime < context.currentTime + 0.12) {
    const step = currentStep;
    const at = nextTime;
    for (let row = 0; row < TRACKS.length; row++) {
      if (pattern.grid[row][step]) playInstrument(row, at, step);
    }
    const thisGeneration = generation;
    const milliseconds = Math.max(0, (at - context.currentTime) * 1000);
    setTimeout(() => {
      if (playing && generation === thisGeneration) markPlayhead(step);
    }, milliseconds);
    nextTime += stepDuration(pattern.bpm, pattern.swing, step);
    currentStep = advanceStep(step);
  }
}

async function start() {
  if (playing) return;
  try {
    await audioReady();
    playing = true;
    generation++;
    currentStep = 0;
    nextTime = context.currentTime + 0.035;
    setTransportLabel();
    schedule();
    interval = setInterval(schedule, 25);
  } catch (error) {
    tell(error.message || "Couldn't start the sound. Try tapping play again.");
  }
}

function stop() {
  playing = false;
  generation++;
  clearInterval(interval);
  interval = null;
  setTransportLabel();
  clearPlayhead();
}

function activatePad(button) {
  button.classList.add("hit");
  setTimeout(() => button.classList.remove("hit"), 125);
  audioReady().then(() => banjoPluck(context.currentTime + 0.015, Number(button.dataset.note), 0.4))
    .catch(() => tell("Couldn't play audio on this browser."));
}

function bindControls() {
  $("play-button").addEventListener("click", () => playing ? stop() : start());
  $("preset").addEventListener("change", e => {
    if (e.target.value === "custom") return;
    loadPattern(clonePreset(e.target.value), e.target.value);
    tell("Tuned up: " + PRESETS[e.target.value].name);
  });
  $("tempo").addEventListener("input", e => {
    pattern.bpm = Number(e.target.value);
    $("tempo-value").textContent = pattern.bpm + " BPM";
    markCustom();
  });
  $("swing").addEventListener("input", e => {
    pattern.swing = Number(e.target.value) / 100;
    $("swing-value").textContent = e.target.value + "%";
    markCustom();
  });
  $("volume").addEventListener("input", e => {
    $("volume-value").textContent = e.target.value + "%";
    if (master && context) master.gain.setTargetAtTime(Number(e.target.value) / 100, context.currentTime, 0.015);
  });
  $("clear-button").addEventListener("click", () => {
    pattern.grid = TRACKS.map(() => Array(STEPS).fill(false));
    markCustom();
    renderGrid();
    tell("Clean slate. Get to pickin'.");
  });
  $("save-button").addEventListener("click", () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pattern));
      tell("Saved right here on this device.");
    } catch {
      tell("This browser won't allow local saves. Try Export instead.");
    }
  });
  $("export-button").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(pattern, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "hollercenter-pattern.json";
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    tell("Pattern packed up and ready to mosey.");
  });
  $("import-file").addEventListener("change", async e => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      if (file.size > 20000) throw new Error("That's too much pattern for one porch.");
      const data = JSON.parse(await file.text());
      const checked = normalizePattern(data);
      loadPattern(checked);
      tell("Pattern brought into the holler!");
    } catch (error) {
      tell(error.message || "Couldn't read that pattern.");
    } finally {
      e.target.value = "";
    }
  });
  document.querySelectorAll(".pad").forEach(btn => btn.addEventListener("click", () => activatePad(btn)));
  document.addEventListener("keydown", e => {
    if (e.repeat || e.altKey || e.ctrlKey || e.metaKey) return;
    const target = e.target;
    if (target instanceof Element && target.closest("input,textarea,select,button,a,[contenteditable]")) return;
    if (e.code === "Space") {
      e.preventDefault();
      if (playing) stop(); else start();
    }
    if (/^[1-6]$/.test(e.key)) {
      const pad = document.querySelector('.pad[data-key="' + e.key + '"]');
      if (pad) activatePad(pad);
    }
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && playing) stop();
  });
}

function initialize() {
  let restored = false;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      loadPattern(normalizePattern(JSON.parse(stored)));
      restored = true;
    }
  } catch {
    // Corrupt or blocked local storage must never break the music lab.
  }
  if (!restored) loadPattern(clonePreset("porch-funk"), "porch-funk");
  bindControls();
  setTransportLabel();
}
initialize();
