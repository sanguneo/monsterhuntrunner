# Recovered creature work

The November 1 runnable creature revision is restored on top of main's first asset rebuild (`bfc0eca10730145f558d7fec62284216884d16a9`). This applies the existing work even though its visual design is unfinished. It does not claim a new art-quality approval.

## Included

- Revised geometry and PBR surfaces for all 18 normal monsters and 12 bosses.
- Six dynamically imported creature themes, cached after loading.
- Loading, cancellation, retry and stale-request handling before entering a world.
- Encounter-owned boss geometry/materials and compatible warning outlines.
- Authored geometry sources, anatomical source licenses, export tools and regression tests.

Hunter, equipment, scenery, hazards, collectibles, effects and gameplay data remain unchanged. Existing public media is retained from main. The recovery archive was checked against its file hash manifest before integration.

## Verification on the recovered tree

- ESLint: passed.
- Full Vitest: 126 tests in 24 files passed.
- TypeScript, production build and emitted dependency-closure budgets: passed.
- All 94 exported GLB containers passed structural, buffer, accessor, normal and index validation.
- Fresh baseline comparison: all 64 non-creature GLBs are byte-identical; exactly the 30 creature GLBs changed.
- Texture export checks and five identical exports of 24 PBR PNG images: passed.
- Seven positive/negative GLB validator controls: passed.
- Separate hunter geometry/garment/ground/anatomy QA: eight tests passed.

Initial JavaScript is 679,663 bytes raw / 184,808 bytes gzip. The first playable school visit, including shared dependencies, is 2,592,322 bytes raw / 678,688 bytes gzip. Large asynchronous chunk warnings remain enabled. These are download-size measurements, not frame-rate measurements.

## Still unfinished

The later high-detail v3 master candidates are preserved separately and are **not** used by this runtime. They still need game-ready conversion and integration. The multiview illustrations are design references, not completed models or calibrated reconstruction inputs.

Live browser playthroughs, WebGL appearance, mobile frame rate and long-session GPU memory are not verified. The attempted local Chromium launch failed because the environment disallows its required socket. Creature preparation yields between model builds; a single build can still stall the loading screen on slower devices.

See `QA_AND_REPRODUCTION.md` for the remaining real-device checklist. This change does not configure or claim production deployment.
