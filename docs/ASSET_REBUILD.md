# Full 3D rebuild — 2026-10-31

## Intent and constraints
Re-author every runtime 3D visual, preserving six-world gameplay, collision envelopes,
pose hierarchy, reward sockets and resource ownership. Cute-spooky storybook collectibles:
intentional smooth silhouettes, thin tapered limbs, seamless organic transitions, expressive
faces, tailored fabrics, restrained enamel and brushed metals. No lumpy sphere assemblies,
no subdivision-only quality claim, no conversion of every species into the same mascot.
The rabbit remains a rabbit hunter. Existing 2D illustrations and game mechanics stay.

## Complete coverage ledger
- Hunter: body, head, muzzle, eyes, ears, arms, feet/boots, tail, hood, open coat, backpack, strap, charm.
- School: bookGhost, pencilGhost, paperGhost; ghostTeacher, ghostGirl.
- Village: zombie, zombieDog, crow; giantZombie, zombieKing.
- Laboratory: wireGolem, sparkBot, drone; lightningGolem, frankenstein.
- Sea: pufferfish, sharkFin, jellyfish; kraken, seaWitch.
- Castle: ghoul, wolf, bat; werewolfChief, dracula.
- Skull: boneGolem, skeletonSoldier, skullBird; skeletonKnight, skullKing.
- Cosmetics: ghost/vampire capes; patchwork/lightning/coral/bone hats.
- Environments: school corridor, ruined village, laboratory, underwater cave,
  gothic gallery, bone palace; each floor, boundaries, architecture, props and background.
- Hazards: LOW, HIGH, PIT, BLOCK, all six distinct themed constructions, not palette swaps.
- Collectibles: coin, gem, heal. Projectiles: player/critical and ball/rod/shard enemies.
- FX: collect/heal/hit/defeat/blast/land/dash plus boss warnings, wall/wave/burst.

## Baseline and budgets
Base commit: 7c6eb0101b23b3445ee46a873a98621d8314236f.
All existing 3D is code-authored procedural geometry; no source GLB/Blend is checked in.
Matched GLB snapshots are exported by scripts/art/export.ts before modification.
Measured budgets and bounds live beside those snapshots in inventory.json.
Targets: <= 6k triangles per normal enemy, <= 20k per boss, <= 30k hunter with gear;
static stage batches retain the existing bounded recycling design. Shared monster geometry
is immutable; boss fade resources remain encounter-owned. Repeated effects and stage modules
are pooled; contact support reuses cached boot samples and scratch transforms.
Changes must retain slide clearance and never move scenery into the playable lane envelope.
Authored static meshes also normalize vertex normals, including degenerate cap samples,
before batching; finite geometry and unit-normal assertions are not a substitute for pixel review.

## Verification and honest limits
Run declared pnpm frozen install, lint, all tests, TypeScript/Vite build, finite geometry and
bounds tests, per-asset budget checks, export/import GLB checks and matched visual sheets.
Attempt actual browser playthroughs; offline Blender renders are not browser screenshots,
FPS measurements or runtime ray tracing. Cycles is an offline path-traced review tool.
Runtime remains Three.js rasterization with physically based surfaces and shadow mapping.
The old player blob-shadow decal is removed to avoid doubling the new real cast shadow.

## Baseline setup findings
The repository declares pnpm and its frozen lock installation succeeds. The unrelated
package-lock.json is stale and npm ci fails; it is not used by declared CI. No connected or
saved coding executor is available; the cloud shell and Blender 4.3.2 are available.

## Concept-first correction
The first smooth hunter checkpoint was explicitly rejected as stiff/LEGO-like. It is not
an approved final. `docs/art-reference/hunter-concept.png` is the generated reference for
the subsequent continuous, relaxed, tailored construction. The four-species concept
addresses wolf/dog differentiation, crow wings and shark anatomy. These images are
concepts—not screenshots, actual game meshes, or a promise of strand-based fur.
Actual GLBs from the current factories must be independently rendered and inspected.
Generated turnaround inconsistencies are resolved in `docs/art-reference/README.md`.
