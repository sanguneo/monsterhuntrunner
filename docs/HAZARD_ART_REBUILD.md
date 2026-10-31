# Hazard semantic correction after pixel review

Source: asset matrix §4 and authored asset spec §4. Collision and pooling remain unchanged.

The first review revealed generic signboards, a sea gravestone, suitcase-like bones,
coral teeth and six raised metal trays. These were structural identity failures,
not problems to solve by adding subdivisions or shine.

| World | LOW | HIGH | BLOCK | PIT edge |
|---|---|---|---|---|
| School | desk with books | bowed cloth pennant and rope | ventilated school locker | broken floor tile |
| Village | broken timber fence | fallen timber lintel and braces | boarded barricade | irregular soil rim |
| Lab | conductor service unit | bent pipe, collars and valve | energized equipment cabinet | service hatch teeth |
| Sea | branching coral colonies | continuous branching coral arch | tall coral reef fan with solid reef foot | shell-like curves |
| Dracula | low gothic chest | suspended curved candle chandelier | pointed gothic stone/tracery gate | stone opening |
| Skull | crossed bones and fallen ribs | rib-vault and bone lintel | masonry with skull relief/crossbones | bone fragments |

All HIGH variants communicate lower clearance near 1.05 m; supports remain at outer
edges where present. No high signboard fallback remains. LOW stays below 0.81 m;
BLOCK retains approximately 3 m full-height occupancy; width stays within original
asset test tolerance. Shared baked materials/geometries are cloned without new GPU
resources per spawn.

## Pit implementation honesty
The runner has an unbroken opaque floor; excavating it would require changing world
geometry/collision orchestration outside this asset pass. PIT therefore uses a dark
opaque opening 3 mm above the road and inward-darkening flush rings. Unlit opening
material prevents a key light turning the void into a gray tray. World-specific lip
fragments stay below 5.5 cm; most edges are 2 cm. This is an authored depth illusion,
not a physical hole or a claim of runtime ray tracing. In-game camera verification
remains needed; offline asset renders are not browser screenshots.

Review outputs: `.art/hazards-concept/`; source saved before previews together with
24 exact runtime GLBs and editable `runtime-review.blend` through parent Library backup.

## Final visual and budget evidence
All 24 standalone final renders and six composites using the exact exported world
floors were inspected. Pixel-driven corrections attached the inner chandelier candles
and valve wheel, removed the mirror/underlap gap around irregular PIT interiors,
and replaced the reef's long spike taper with tiered branching coral. Timber uses a
muted wood material rather than a green-plastic sign color.

Final per-hazard maximum: 8,000 triangles / 6 material draws (below the 9K test cap).
Focused hazard/coverage suite: 6 passing tests. Targeted lint and aggregate TypeScript
check passed at this checkpoint. Final sheets are `sheet.jpg` and
`roadground-sheet.jpg` in `.art/hazards-concept`. These demonstrate offline geometry,
placement and legibility only, not device FPS or a captured browser playthrough.

Normal-clean delivery refresh: all 24 final hazard POSITION accessor SHA-256 values
were unchanged after the shared normal normalization fix. GLBs and both editable
Blends were refreshed and passed unit-normal/container/accessor validation without
rerendering invariant geometry. `normal-refresh-report.json` records this check.
The aggregate props folder's ten stale hazard PNGs were archived and replaced with
the matching already-inspected final hazard PNGs; its contact sheet was rebuilt.
