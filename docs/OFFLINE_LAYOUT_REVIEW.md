# Exact-factory offline layout review

**Final geometry/pixel checkpoint:** the six compositions now use the independently
reviewed hunter with a closed continuous inner pelvis. All six saved Blender scenes
verify that pelvis object; GLBs pass unit-normal/accessor validation. Every final
full-size render and the final contact sheet were inspected. Earlier images are kept
only in the local `superseded/` folder, excluded from the deliverable.

`scripts/art/export-layout.ts` constructs each world using the actual `Environment`,
`Player`, `Monster`, `Obstacle`, and `Pickup` runtime factories. It preserves their
native scale, transforms and 2 m lane spacing. Grounded-monster offsets come from
`Monster` itself, not ad hoc review adjustments.

The arrangement is deliberately authored for review: HIGH in left lane and LOW in
right lane at 10 m; three species in lanes 0/1/2 at 16/19/22 m; PIT in right lane at
22 m; BLOCK in left lane at 28 m; coin/gem/heal in center lane at 6/9/12 m. It is not
an assertion that this exact encounter is spawned by the game scheduler.

`CameraController` is instantiated at aspect 480/600, set to `follow`, then reset at
player position (0,0,0). Its actual perspective camera is exported in GLB and reused
by Blender, rather than approximating its angle or focal length. The six compositions
are rendered with offline Cycles review lights, AgX and approximate game fog. They
are **not live WebGL screenshots, runtime ray-tracing proof, or device FPS evidence**.

Commands:

```
node node_modules/.pnpm/vite-node@*/node_modules/vite-node/vite-node.mjs scripts/art/export-layout.ts
blender -b -t 4 --python scripts/art/layout-review.py -- .art/layout-review
# Persist sources, six GLBs and layout-editable.blend to Library before this step:
blender -b -t 4 --python scripts/art/layout-review.py -- .art/layout-review --render
```

## Current exact-factory scene budget ledger

Counts include all eight active environment chunks, roads, hunter, three monsters,
four hazards and three pickups. These are exported mesh/triangle counts, not measured
GPU submission counts or FPS. Runtime frustum culling can reduce visible work.

| World | Triangles | Mesh/material batches |
|---|---:|---:|
| school | 67,294 | 214 |
| zombie | 76,058 | 169 |
| lab | 100,730 | 189 |
| sea | 99,842 | 157 |
| dracula | 97,782 | 188 |
| skull | 101,970 | 162 |

## Review interpretation
The exact follow camera confirms consistent native scale and three-lane placement;
raised silhouettes stay in their assigned lane. Near HIGH openings, LOW obstacles,
PIT darkness and BLOCK height are distinguishable. Walking species use their runtime
ground offset. Dark village barricade planks and dark wolf/crow forms at 19–28 m
have lower contrast under the chosen offline lighting than their pale accents; this
is a caution for real-device playtesting, not a measured runtime visibility failure.
The offline review lights do not reproduce the WebGL tone mapper, shadow map, PMREM,
animation or motion contrast, so final gameplay readability remains a browser/device
QA item rather than a claim based only on these images.
