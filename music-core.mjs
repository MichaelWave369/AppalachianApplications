export const STEPS = 16;
export const TRACKS = Object.freeze([
  { id: "stomp", name: "Boot Stomp", detail: "THE FOUNDATION", symbol: "◉" },
  { id: "wash", name: "Washboard", detail: "THE SCRATCH", symbol: "≋" },
  { id: "jug", name: "Jug Bass", detail: "THE LOW END", symbol: "♩" },
  { id: "banjo", name: "Banjo", detail: "THE PICKIN'", symbol: "✳" },
  { id: "clap", name: "Porch Clap", detail: "THE COMPANY", symbol: "✦" }
]);

function row(...indices) {
  return Array.from({ length: STEPS }, (_, i) => indices.includes(i));
}

export const PRESETS = Object.freeze({
  "porch-funk": {
    name: "Porch Funk", bpm: 106, swing: 0.13,
    grid: [
      row(0, 4, 8, 12),
      row(2, 6, 10, 14),
      row(0, 3, 6, 8, 11, 14),
      row(0, 5, 7, 10, 13),
      row(4, 12)
    ]
  },
  "bluegrass-stomp": {
    name: "Bluegrass Stomp", bpm: 128, swing: 0.06,
    grid: [
      row(0, 4, 8, 12),
      row(2, 6, 10, 14),
      row(0, 4, 8, 12),
      row(0, 2, 4, 6, 8, 10, 12, 14),
      row(4, 12)
    ]
  },
  "holler-break": {
    name: "Holler Break", bpm: 142, swing: 0.20,
    grid: [
      row(0, 3, 7, 8, 11, 14),
      row(2, 4, 6, 10, 12, 14, 15),
      row(0, 3, 6, 8, 11, 14),
      row(0, 4, 7, 10, 12, 15),
      row(4, 7, 12, 15)
    ]
  }
});

export function normalizePattern(value) {
  if (!value || typeof value !== "object" || !Array.isArray(value.grid) || value.grid.length !== TRACKS.length ||
      !value.grid.every(r => Array.isArray(r) && r.length === STEPS && r.every(v => v === true || v === false || v === 0 || v === 1))) {
    throw new Error("That pattern doesn't have five tracks with sixteen steps each.");
  }
  const bpm = Number(value.bpm);
  const swing = Number(value.swing);
  if (!Number.isFinite(bpm) || !Number.isFinite(swing)) {
    throw new Error("Tempo or swing isn't a valid number.");
  }
  return {
    name: typeof value.name === "string" ? value.name.trim().slice(0, 60) || "My Holler Groove" : "My Holler Groove",
    bpm: Math.max(60, Math.min(180, Math.round(bpm))),
    swing: Math.max(0, Math.min(0.4, swing)),
    grid: value.grid.map(r => r.map(Boolean))
  };
}

export function clonePreset(id) {
  if (!Object.prototype.hasOwnProperty.call(PRESETS, id)) {
    throw new Error("Unknown preset.");
  }
  return normalizePattern(PRESETS[id]);
}

export function stepDuration(bpm, swing, step) {
  const tempo = Math.max(60, Math.min(180, Number(bpm)));
  const amount = Math.max(0, Math.min(0.4, Number(swing)));
  return 60 / tempo / 4 * (step % 2 === 0 ? 1 + amount : 1 - amount);
}

export function advanceStep(step) {
  return (step + 1) % STEPS;
}
