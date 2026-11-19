# Appalachian Applications

### Mountain wisdom. Modern machines.

Welcome to the holler. Open-source experiments with a little Appalachian charm, genuine utility, and an unreasonable amount of bounce.

## HollerCenter 369 / Field Experiment No. 001

HollerCenter is a playable, browser-only step-sequencer and music playground.

- Five homegrown Web Audio instruments: Boot Stomp, Washboard, Jug Bass, Banjo, and Porch Clap.
- Sixteen-step sequencer with three working patterns: Porch Funk, Bluegrass Stomp, and Holler Break.
- Adjustable tempo (60–180 BPM), swing, master volume, and track muting.
- Six live banjo pads, playable by click or keyboard keys 1–6.
- Local pattern saving, JSON export, and JSON import with input validation.
- Responsive interface and keyboard-accessible step buttons.
- No third-party runtime dependencies, cloud accounts, telemetry, network calls, or installation.

### Play it locally

Open the project with any basic static HTTP server, for example:

    python -m http.server 8000

Then visit http://localhost:8000.

The page uses JavaScript modules, so opening index.html directly with a file:// URL may be blocked by browser security rules.

### Controls

1. Press GO ON NOW! to start the groove. Audio begins only after a user interaction.
2. Click a square to enable or disable a note in that track.
3. Pick a preset, set tempo and swing, or mute a track with M.
4. Click a pad or press 1 through 6 to play banjo notes. Space toggles the sequencer when no input or button is focused.
5. Save to this device or export a JSON pattern to share. Import accepts valid five-track, sixteen-step patterns under 20 KB.

All instrument sounds are synthesized locally; no sample packs or copyrighted audio are shipped.

### Publish to GitHub Pages

The Pages workflow runs after a merge to main, but GitHub Pages must be enabled for the repository:

1. Visit repository Settings → Pages.
2. Under Build and deployment, choose GitHub Actions as the source.
3. Merge the reviewed feature PR into main, then inspect the deployment workflow.
4. The expected project URL after a successful deployment is https://michaelwave369.github.io/AppalachianApplications/.

Until a deployment is confirmed, that URL should not be assumed live.

### Tests

The GitHub Actions CI workflow runs Node's built-in test runner on each pull request and main-branch push.

Run locally with:

    node --check app.js
    node --test tests/*.test.mjs

The tested pure functions live in music-core.mjs.

### What comes next

- Expanded playable instruments and a real sample/sound preset library.
- A mixer with per-track volume and effects, then recording and export.
- Future Mosey.NET jam networking, with clear privacy, latency, and security boundaries.
- Possible standalone native plugins later. The present Washboard and Jug Bass instruments are browser synths, not VST or executable binaries.

### The rule of the porch

Nothing is required of you here. Stillness or loudness, all is welcome.

Built in the holler. Tested in the browser. Shared with everybody.

## License

MIT. See LICENSE.
