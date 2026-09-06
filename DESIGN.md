# Cute-spooky courier runner

## 1. Direction
An articulated cream-and-caramel woodland courier visits the existing six
spooky worlds. Rounded toy materials, mint accessories, warm lanterns and
clear obstacle silhouettes replace placeholder geometry. Existing title,
world, reward and HUD image assets remain the visual identity.

## 2. Color and material
Fur `#d69a61`, cream `#ffedce`, mint `#70d5b7`, ink `#352c38`,
blush `#edaca3`. Roughness 0.78-0.95 for plush scenery; brighter smooth
coins and jewels. Existing per-world colors tint the path and architecture.
Warm key light, cool rim light, hemisphere fill; fog limits distant clutter.

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
