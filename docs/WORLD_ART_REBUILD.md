# Six architectural kits

The source requirements are `에셋소싱.md` §7 and §0.1, supported by the
six-world table in `최종기획및설계서.md` §1. This is a replacement of the
previous scenery authoring, not a color swap or a subdivision increase.

| World | Rebuilt authored content |
|---|---|
| School | Round-headed moonlit windows, dark skyline inlays, four ventilated lockers, framed classroom door, timetable plaque, brass lanterns, wall dado/moulding |
| Village | Curved pitched roof silhouettes, timber frames, boarded windows, recessed doors, chimneys, leaning fence and continuous bent branch skeleton |
| Lab | Bordered modular panels, overhead routed conduit, paired Tesla coils, brushed conductor caps, inset gauge console and restrained cyan indicators |
| Sea | Seam-periodic smooth cave-wall ribbons, three tapered branching coral plants, bubble column, fan shell and pearl, submerged light bands |
| Dracula | Pointed gothic stained-glass bays with separate colored panes, rosettes, narrow pilasters, stone plinths, curved candle sconces |
| Skull | Staggered masonry blocks, continuous tapered bone ribs, arched royal skull tablet and sockets, side-mounted violet braziers |

All worlds have new boundary curbs, low inlays and floor joints. Raised scenery
is outside the playable envelope, including every curve. Structural curves use
small authored section counts; flat surfaces do not spend vertices on tessellation.

## Lifecycle and performance
Eight absolute recycled modules still cover the 80 m fog horizon and reset
without accumulated offsets. All six variants are built once, batched by material
and cloned with shared GPU resources; theme changes only toggle visibility and
floor colors. No animation allocations or shadow-casting point lights were added.
The road and shoulder planes receive the main runtime shadow atlas.

Geometry budgets are measured, not inferred from offline render speed. The exact
current full-scene report is generated in `.art/world-review/inventory.json`.
Tests require <=60K triangles and <=160 draws for the eight active modules;
additional authored-kit tests enforce <=7,499 triangles and <=19 batches per kit.

## Review provenance
`scripts/art/export-worlds.ts` exports exact active runtime geometry, including
floors and all eight shared modules. `scripts/art/world-review.py` imports those
GLBs into an editable Blender scene and uses the runner's perspective composition.
Save source, GLBs and editable `.blend` before invoking `--render`.
Cycles renders are offline visual QA, not WebGL screenshots or a phone FPS result.
All geometry in this kit is original local authoring; no external model license
or production device performance is asserted.

## Pixel review corrections
First-pass full stage renders exposed overly uniform ground treatment and rigid-looking
sea ridges. The final source uses world-specific flat floor inlays and one continuous,
periodic cave surface instead of attached rib tubes; coral branches taper to closed tips.
Periodicity makes adjacent 16 m cave modules meet at equal position and tangent.
The final offline review approximates normal runtime fog at24–76 m, rather than
showing a hard distant geometry cutoff. This is still not a browser capture.

Normal-clean delivery refresh: all six full-scene GLBs were re-exported after the
shared normal normalization change. Raw POSITION accessor SHA-256 values remained
identical; the editable world Blend was rebuilt. All six GLBs pass unit normals,
finite accessors, index and buffer validation. Existing inspected image evidence is
preserved because geometry positions and shading directions did not change.
