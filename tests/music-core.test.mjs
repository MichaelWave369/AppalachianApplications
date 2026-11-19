import test from "node:test";
import assert from "node:assert/strict";
import { TRACKS, STEPS, PRESETS, clonePreset, normalizePattern, stepDuration, advanceStep } from "../music-core.mjs";

test("every preset has exactly five tracks of sixteen boolean steps", () => {
  for (const id of Object.keys(PRESETS)) {
    const p = clonePreset(id);
    assert.equal(p.grid.length, TRACKS.length);
    for (const track of p.grid) {
      assert.equal(track.length, STEPS);
      assert.ok(track.every(v => typeof v === "boolean"));
    }
  }
});

test("cloning a preset never changes the original", () => {
  const a = clonePreset("porch-funk");
  const b = clonePreset("porch-funk");
  a.grid[0][0] = !a.grid[0][0];
  assert.notEqual(a.grid[0][0], b.grid[0][0]);
});

test("untrusted pattern data is shape-checked, normalized and bounded", () => {
  const p = clonePreset("porch-funk");
  p.bpm = 9999;
  p.swing = -22;
  p.grid[0][0] = 1;
  const normalized = normalizePattern(p);
  assert.equal(normalized.bpm, 180);
  assert.equal(normalized.swing, 0);
  assert.equal(normalized.grid[0][0], true);
  assert.throws(() => normalizePattern({ bpm: 80, swing: 0, grid: [] }));
  assert.throws(() => normalizePattern({ ...p, bpm: "holler" }));
  assert.throws(() => normalizePattern({ ...p, grid: [...p.grid.slice(0, 4), Array(16).fill("no")] }));
});

test("swing stretches even steps and shrinks odd steps without changing bar length", () => {
  const straight = stepDuration(120, 0, 0);
  const long = stepDuration(120, 0.2, 0);
  const short = stepDuration(120, 0.2, 1);
  assert.ok(long > straight);
  assert.ok(short < straight);
  assert.ok(Math.abs(long + short - straight * 2) < 0.0000001);
});

test("step cursor wraps at the end of a bar", () => {
  assert.equal(advanceStep(0), 1);
  assert.equal(advanceStep(15), 0);
});
