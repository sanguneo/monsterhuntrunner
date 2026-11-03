# Verification and reproduction

## Supported reproducible commands
```sh
pnpm install --frozen-lockfile
pnpm lint
pnpm test
pnpm build
pnpm art:export
pnpm art:validate
python3 scripts/art/test-validator.py
pnpm art:qa
```
The export command uses Vitest's pinned vite-node dependency; no new runtime loader,
model service or network asset fetch is required. Runtime models are authored directly
from source. The `.glb` files are interoperable review/editing outputs of those same
factories, not substitutes secretly used only for presentation.

`art:validate` checks GLB2 headers/chunks, declared buffer ranges, finite accessor data, equal per-primitive attribute counts, unit normals,
triangle modes and index bounds. It is intentionally not called Khronos certification.
Blender 4.3.2 imports of exact outputs provide an independent interoperability check.
Positive/negative controls exercise valid data, bad magic/length, NaN positions,
zero normals, mismatched attribute counts and out-of-range indices using disposable copies—not weakened assertions.

## Offline visual review
- `scripts/art/export.ts`: complete visual inventory (including normal enemies, bosses,
  hunter/equipment, hazards, collectibles, projectiles, attack walls, wave/telegraphs, FX).
- `export-hunter-poses.ts`: actual run/jump/slide/dash plus maximum combined equipment.
- `export-worlds.ts`: full eight-module stage scenes and floor/shoulder planes.
- `review.py`: matched three-quarter model views; hunter front and rear.
- `world-review.py`: runner-perspective stage review with approximate distance fog.
- `reconstruct-world-baseline.ts`: clones exact untouched baseline module GLBs for matched
  comparison; does not regenerate a fake baseline with new geometry.

Save source, GLBs and editable Blender files before rendering. Example:
```sh
blender -b -t 4 --python-exit-code 1 --python scripts/art/review.py -- .art/final
# Save that checkpoint to durable storage before the following preview:
blender -b -t 4 --python-exit-code 1 --python scripts/art/review.py -- .art/final --render --ids=hunter
```
The model-review importer writes a hash manifest only after a successful save. Hunter
hero rendering checks the exact Blend hash, each input GLB hash and imported mesh counts
before generating pixels. `python3 scripts/art/test-review-manifest.py .art/hunter-concept`
accepts a valid handoff and rejects modified Blend/GLB copies without touching originals.
This offline control requires Blender and is separate from the portable PR CI.
A zero shell exit code alone is not evidence of successful
Blender import: commands use `--python-exit-code 1`, and import tracebacks are failures.

Generated review files live under ignored `.art/`; recovery ZIPs and large renders are
not bundled into the game or committed as giant backup blobs.

## Covered contracts
Finite mesh attributes; unique species and world geometry; per-asset triangle/draw
budgets; immutable monster/hazard resources; independent boss fade/disposal; equipment
reuse and distinct geometry; floor and overhead clearance for all eight hat/cape
combinations; feet-first slide orientation; lane-safe stage bounds; deterministic
8-module recycling through distant jumps/restarts; view-only changes leave gameplay
collision positions and damage rules unchanged.

## Remaining real-device gate (not claimed passed)
This executor's Chromium launch fails with `socket() failed: Operation not permitted`.
No denied route was bypassed. Offline Cycles pixels cannot establish WebGL shader
appearance, input usability, GPU draw timing or mobile frame rate.

On a supported browser, run `pnpm dev` and check:
1. Desktop and portrait/landscape mobile boot/title; no console errors.
2. Tutorial lane/jump/slide/shoot/skill steps, interruption/restart and skip.
3. Every world: lighting, lane readability, low/high/pit/block collision agreement.
4. All twelve boss intros, attack telegraphs, walls/waves, stagger outline and fade.
5. All gear pairs through run/jump/feet-first slide/dash; pause must freeze motion.
6. Repeat world changes, deaths/checkpoint revivals, rewards and title resets; no resource growth.
7. Mid-range phone FPS and GPU memory with shadows enabled, including long sessions.

The intended mobile budget is bounded geometry and one shadow atlas (1024 on narrow
screens, 2048 on wider screens), not a performance guarantee inferred from polygon count.

## Editable handoff
The source archive contains authored code, tests, configuration, review scripts and
full-resolution concept references. Apply it over the documented base repository;
unchanged original 2D/public media remain in Git rather than being duplicated in every
recovery archive. Grouped GLB/Blend archives contain the exact exported geometry and
editable material/mesh scenes. Each archive is independent and stays below 15 MiB.

`art:qa` runs the actual garment/face/ground-contact/root-attachment tests and saves their full JSON reports under
`.art/hunter-concept/`, retaining nonzero exit status on failed tests or missing reports.
The test source contains no Node filesystem dependency. Conservative unclassified hem
bands are explicitly reported and require rendered-pixel judgement, not assumed success.
