# Planning fidelity and 3D refinement

## Source of truth

The Obsidian vault is `C:/Users/USER/Documents/croissmouse`.
The relevant folder is `20_Projects/monster_runner`.

- `기획초안.md`, world sections: night school, ruined village, secret
  laboratory, deep sea/shipwreck/caves, dark castle, dungeon/throne room.
- Vault `에셋소싱.md` sections 0.5, 2, 3, 5.2 and 7: cute-spooky cartoon
  presentation, recognizable creature silhouettes, six different reward
  designs, and specific architectural sets.
- Vault `3D 에셋 소싱·AI 생성 가이드.md`: prefer verified source assets;
  missing signature creatures/accessories require custom work.
- Repository `최종기획및설계서.md` v2.0 is the current gameplay authority.
  The vault's v1.0 MVP document is older and must not remove the shipped
  six worlds, progression or controls.

## Assessment of the previous pass

The cute proportions, readable controls and completed game loop fit the
audience. The atmosphere does not fully fit: every world uses the same
sunlit garden road, green trees and pastel sky. A few props and different
colors do not make that road a school corridor or an underwater cave.

Model detail is also insufficient. Most player parts are scaled spheres,
several enemies are still generic solids with eyes, and reward hats/capes
change color rather than construction. Increasing sphere subdivisions
alone would not fix these problems.

## Corrected direction

| World | Required structure and mood | Readability constraint |
| --- | --- | --- |
| School | Indigo night corridor, lockers, mullioned windows, classroom doors, chalkboards and warm lamps | Keep the central three lanes open; props belong against walls |
| Zombie | Damaged village facades, leaning fences, gravestones and twisted bare branches in green mist | Broken pieces must not imply invisible gameplay collisions |
| Laboratory | Metal panels, pipes, Tesla coils, gauges and cyan electrical light | Distinguish background electricity from yellow/red attack markers |
| Deep sea | Dark blue rock vaults, branching coral, pearls and bubbles | Avoid land trees/streetlamps; preserve track edges and silhouettes |
| Dracula | Pointed gothic arches, stained glass, candle sconces and crimson textiles | Arches stay above the camera and never hide warnings |
| Skull | Block stone, bone ribs, skull reliefs, braziers and purple/gold royal accents | Decorative bones stay outside the playable lane envelope |

The rabbit mascot is a deliberate visual choice, not a character mandated
by the documents. Keep its recognizable cute face, but make it read as a
small monster hunter: tailored clothing, stitched leather equipment,
boots, clasps and a charm. Refine anatomical transitions and facial
construction while preserving the established run/jump/slide rig.

Enemies and bosses must be recognizable by their silhouettes and props:
books/pages, pencils/erasers, paper wings, canine snouts, bird wings,
electrical coils, jellyfish tentacles, shark fins, skulls, crowns and armor.
The six rewards need actual different geometry, not color swaps.

## Asset provenance

The vault records 120 downloaded GLBs under `sourced_assets/`, but that
directory is absent on this PC. Vault-wide GLB/manifest and Downloads
checks found none; an independent read-only audit confirmed the absence.
No per-file licenses or animation clips could therefore be verified.

This revision authors geometry in the project instead of claiming those
GLBs were imported. Curves, lathed forms, extruded profiles, bevels and
material-specific surfaces are local source assets. No third-party model
download, paid generation service, new rendering dependency, or 2D image
replacement is required. Future GLB imports still need the documented
license, transform and animation checks.

## Verification

The user's later instruction explicitly requested a geometry increase.
Actor curves, bevels, tubes, rings, head and ears now use denser geometry;
the repeated environment keeps its lower-density, batched templates.
Measured bare hunter: 15,708 -> 28,448 triangles. All 30 enemies/bosses
increased, by 70-124% for monsters and 85-117% for bosses. The old per-actor
budgets are recommendations superseded by that instruction, not hidden
failures. A fully equipped hunter, kraken and four enemies in the sea
environment peaked at 136,708 triangles and 234 draws in the local test.
Across 120 real browser frames at a mobile viewport, the mean was 16.806 ms
and p95 16.9 ms. This is a workstation browser measurement, not a phone
hardware certification.

- Preserve combat numbers, spawn rules, controls, saved progress and UI.
- Compare current-model front/back/poses and all world/entity identities.
- Verify distinct equipment through real inventory application, with
  bounded resource ownership and slide clearance.
- Record triangles, draw calls and real browser frame samples; the source
  targets roughly 150K visible triangles and at least 30 fps. A desktop
  browser sample is not an iPhone/Galaxy hardware certification.
- Retain existing 2D illustrations and icons byte-for-byte.
- Detailed evidence is retained locally in `.omo/refinement-notepad.md`
  and `.omo/evidence/refinement/`.
