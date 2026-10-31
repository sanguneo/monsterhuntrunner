# Normal-enemy reconstruction

All 18 documented identities are authored in `MonsterModels.ts`. The original gameplay
stats, behavior definitions, collision root positions and enemy cache contract remain.
No imported marketplace meshes or external runtime model requests are introduced.

## Pixel-driven corrections
- Wolf: continuous muzzle/nape/lean torso, bowed legs/hocks, swept broad tail and throat bib.
- Zombie dog: distinct dropped hound ears, green coat/patch and compact dog expression,
  not merely a recolored wolf.
- Crow: broad overlapping feather vanes and a dark projecting beak. Earlier string-like
  wing drafts were rejected during review; bat retains its separate web-wing silhouette.
- Shark: long tapered horizontal trunk, white belly, swept dorsal/pectoral fins and
  crescent vertical tail. Side review verifies anatomy hidden by a frontal runner view.
- Bone golem: open rib cage with negative space around a spine, not white stripes on a bean.
- Wire golem: grouped cable strands rather than flesh-colored flipper arms.
- Skull bird: pale skull/wings and chest ribs; pencil/book/paper ghosts retain object identity.

Generated `docs/art-reference/species-concept.png` guides anatomy, not high-cost hair strands.
The final matched views are exported actual factory meshes, not concept-image substitutes.
Six walking species receive a visual-only ground offset and restrained gait sway; collision
roots stay unchanged. Floating/flying species keep their established hovering behavior.

## Measured mesh budgets
| Species | Triangles | Material batches |
| --- | ---: | ---: |
| bookGhost | 3,208 | 11 |
| pencilGhost | 2,784 | 10 |
| paperGhost | 1,148 | 5 |
| zombie | 4,672 | 11 |
| zombieDog | 4,708 | 7 |
| crow | 4,184 | 6 |
| wireGolem | 4,188 | 9 |
| sparkBot | 2,684 | 6 |
| drone | 3,656 | 8 |
| pufferfish | 3,920 | 8 |
| sharkFin | 3,408 | 6 |
| jellyfish | 4,008 | 7 |
| ghoul | 4,148 | 8 |
| wolf | 5,432 | 8 |
| bat | 4,960 | 8 |
| boneGolem | 5,612 | 5 |
| skeletonSoldier | 4,584 | 7 |
| skullBird | 4,392 | 6 |

The immutable templates are material-batched once. Instances share geometry/materials and
own transforms only. Tests enforce finite position/normal buffers, all18 unique geometry
fingerprints, <=6,000 triangles and <=12 batches. These are geometry budgets, not phone FPS.
