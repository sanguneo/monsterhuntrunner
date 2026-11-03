# Boss geometry rewrite

Source contracts: `에셋소싱.md` §3.1–3.3 and `최종기획및설계서.md` §9.
No boss IDs, attack colors, hitboxes, timings or pattern definitions are changed.

## Structural changes
- Replaced the previous sphere-assembled bodies with authored ring profiles and
  continuous tapered sleeve/limb sweeps. Hands are compact single surfaces, not
  clusters of balls. Boots integrate ankle and toe through a single profile.
- Cloth gowns have shallow geometric folds inside the surface; capes are curved
  gridded sheets rather than thick flat extrusions. Details remain low contrast
  enough for faces and combat warnings to read first.
- All twelve identities have independent silhouettes and signature props:
  chalk/board teacher; long-haired schoolgirl; broad patched zombie; crowned
  zombie monarch; coil golem; flat-haired stitched Frankenstein; eight-tentacle
  kraken; coral/pearl-crowned sea witch; pointed-ear clawed werewolf; high-collared
  bat-cape Dracula; armored shield/lance skeleton; crowned skeletal sorcerer.
- The werewolf forehead and muzzle share one continuous shell. The kraken has a
  single mantle and eight uninterrupted tentacle sweeps instead of jointed tubes.
- Per-encounter factory ownership and material batching remain unchanged.

## Verified geometry budget
| Boss | Triangles | Material draws |
|---|---:|---:|
| ghostTeacher | 14,992 | 15 |
| ghostGirl | 14,568 | 12 |
| giantZombie | 19,740 | 15 |
| zombieKing | 19,036 | 17 |
| lightningGolem | 12,780 | 11 |
| frankenstein | 19,296 | 17 |
| kraken | 19,536 | 10 |
| seaWitch | 17,420 | 18 |
| werewolfChief | 18,948 | 13 |
| dracula | 17,144 | 16 |
| skeletonKnight | 15,556 | 13 |
| skullKing | 16,876 | 11 |

These are runtime mesh counts, not an FPS result. The exact exports and an editable
Blender import are produced by `scripts/art/export-bosses.ts` and `scripts/art/review.py`.
Visual verification status is recorded after inspecting rendered pixels; no browser
performance or live-game quality claim follows from a Blender review image.

## Visual review corrections
The first actual Blender render exposed open proximal sleeve roots and a schoolgirl
hair shell obscuring the face. These were corrected by burying sleeve roots within
the torso and moving the continuous hair curtain behind the face/uniform. The kraken
tentacles now originate deep inside the mantle, and the werewolf has a tapered chest,
fur ruff and clawed feet rather than the shared dressed-humanoid construction.

`check-bosses.ts` verifies finite position/normal arrays, <=20K triangles, <=18 material
batches, ground-relative pivot, bounded height/footprint and shadow flags for all twelve.
The existing two enemy ownership/disposal tests also pass across all boss definitions.

Parent art review also required clearer giant-vs-Frankenstein and canine-vs-humanoid
silhouettes. The giant now uses a broader, lower belly/shoulder shell and wide stance;
the werewolf uses shorter broad ears and a projecting continuous muzzle with a softly
blended cream vertex-color region. These are geometry/vertex-color changes, not a
new protruding muzzle primitive.

## Image-first organic gesture pass
The user rejected the stiff/block-like hunter silhouette on October 31. The supplied
four-view rabbit concept was inspected directly; only relaxed gesture, supple garment
construction and expressive eye structure were transferred, never rabbit species or
its teal outfit. Humanoid boss sleeves are now extrusions of openings in the torso
grid with shared shoulder-boundary vertices, rather than separate intersecting tubes.
Elbow/wrist paths are asymmetric; soft weight shifts and head tilts preserve the feet
and attack pivots. Organic eyes add sclera and iris; skull sockets and robot optics
retain their distinct identities. This pass must be assessed from actual renders, not
from these construction descriptions alone.

The representative concept render exposed an open cuff on the sea witch's bent wrist.
Sleeve endpoints are now capped and hands/cuffs follow the actual wrist tangent.

### Final rendered inspection (2026-10-31)
All twelve exact runtime GLBs were rendered in Blender 4.3 Cycles and individually
inspected at 512 × 512 after the cuff correction. The shared shoulder branches are
smooth without exposed openings; expressive wrists no longer expose dark cuff holes.
Teacher board/chalk, schoolgirl hair/uniform, giant tank proportions, Frankenstein
contacts/stitches, golem coils, kraken tentacles, witch regalia, canine muzzle/ears,
vampire collar/fangs and both skeletal signatures remain readable. All faces remain
visible. The final contact sheet is `.art/boss-concept/boss-lineup.png`; individual
views use the boss ID as filename in that same folder. These are offline Cycles
review images, not browser screenshots or proof of runtime ray tracing/FPS.

Final validation: TypeScript and dedicated ESLint pass; 4 ownership/disposal/chase/outline
warning tests pass; all 12 GLB headers/embedded buffers validate; all 12 finite mesh,
shadow, pivot/footprint and <=20K-triangle/<=18-batch contracts pass. No gameplay
identity or attack contract was changed in this boss model rewrite.

Final parent review caught held props still using pre-gesture coordinates. Actual
posed-hand grip anchors now position the witch/king staff shafts, knight sword and
shield; the teacher's overly long pole is replaced by a short angled chalk stick
passing through the hand. This fixes attachment placement rather than changing the
documented identities. Triangle/material budgets are unchanged.

The four attachment-corrected views were re-rendered and inspected; the teacher's
chalk now projects visibly from the hand. Final body art is frozen. Runtime peer
review additionally found the stagger silhouette did not follow the body's sway;
`Boss.update` now copies its quaternion and a regression test verifies aligned
rotation, independent outline geometry and exactly-once outline disposal.
