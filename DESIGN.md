# Cute-spooky monster hunter runner

## 1. Direction
An articulated cream-and-caramel rabbit hunter explores the six worlds
specified in the original vault. Preserve cute proportions, but use precise
facial construction, tailored cloth, stitched leather, boots and clasps.
Night-school corridors, ruined village streets, electrical laboratories,
underwater caves, gothic galleries and bone/stone halls must differ in
structure, not just color. Existing 2D illustrations remain the reference.
See `docs/ART_DIRECTION_REVIEW.md` for source evidence and provenance.

## 2. Color and material
Fur `#d69a61`, cream `#ffedce`, mint `#70d5b7`, ink `#352c38`,
blush `#edaca3`. Roughness 0.78-0.95 for plush scenery; brighter smooth
coins and jewels. Existing per-world colors tint the path and architecture.
Warm readable character key light, cool rim and restrained hemisphere fill.
World-specific emissive windows, candles and coils punctuate darker fog.
Do not wash every world toward pale blue or add garden vegetation indoors.
Model detail comes from curved profiles, bevels, seams, folds, eyelids,
toes, soles and material contrast; tessellation alone is not refinement.
The user's subsequent geometry request is implemented with denser actor
surfaces: ModelKit density 1.35 increases curved profiles and bevel rings,
while scenery stays at density 1. The bare hunter is 28,448 triangles;
monsters are 1,830-5,032 and bosses 28,564-38,336. These exceed the original
per-actor recommendations deliberately; the combined scene remains bounded.

## 3. Typography
Preserve Segoe UI / Apple SD Gothic Neo / Noto Sans KR. HUD labels retain
bold white text with a dark backing. On narrow screens: 14 px health text,
18 px currency, 22 px distance, 20 px wrapping announcements.

## 4. Space and responsive behavior
The playable corridor occupies world X -3 to +3. Decoration stays outside.
Desktop keeps existing corner skill arc. At <=600 px width, skills form a
bottom dock of 64 px buttons with 12 px gaps, never over the courier.
At <=480 px height, use 48 px buttons. Respect safe-area insets.

## 5. Existing primitives and states
HUD health/experience bars, skill buttons (locked, ready, cooldown, auto),
pause/resume, world selector, stage intro, reward and result screens remain
the shared primitives. Real game setup through window.game in development
is their QA harness; no second mock UI is maintained.

## 6. Motion and interaction
Gameplay stays at 60 Hz; player transforms interpolate at render frequency.
Pointer intent commits once at 24 CSS px, expires after 150 ms, and clears
on lifecycle boundaries. Gait, ear/scarf follow-through and landing squash
use delta time. Slide is a low prone pose, not a flattened head.
Equipment has six distinct constructions and inherits the entire pose.
Secondary motion stays subtle; no material/geometry allocation per frame.
These runner mechanics have no equivalent form-component animation.
Reduced-motion CSS removes decorative UI animation; gameplay cues remain.

## 7. Accessibility constraints
Existing Korean/English UI and image alternatives remain. Touch targets
remain at least 44 px. Announcements wrap within the viewport. Pause must
freeze gameplay, animation and effects. No decoration may hide a hazard.

## 8. Evidence and accepted debt
Actual desktop, portrait, landscape, six-world and twelve-boss captures
are recorded under the local `.omo/evidence/` directory. Procedural models
use shared geometry and a fixed 96-particle pool. Three.js remains in the
main bundle; Vite's 500 kB advisory is not disabled.
