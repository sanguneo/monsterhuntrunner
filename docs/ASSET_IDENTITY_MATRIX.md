# Identity and intent traceability

Sources read: `최종기획및설계서.md` v2.0, `에셋소싱.md` v2.0,
`검토의견.md`, `DESIGN.md`, and `docs/ART_DIRECTION_REVIEW.md`.
The first two are authored product/asset requirements. The July review is historical
implementation evidence, not current test proof. The English art notes document the
previous pass, not authority to replace the user's species or themes.

## Binding principles
- Ages 6–12; mobile portrait; cute-spooky, never gore or realistic mutilation
  (`최종기획및설계서.md` §0; `에셋소싱.md` §0.5/12).
- Enemy role silhouette: broad slow tank / lean straight runner / small weaving flyer
  (`에셋소싱.md` §2; design §7.2). Preserve hostile-vs-collectible readability.
- +Z forward, Y up, lane spacing 2, view/logic separation, fixed hitboxes (design §3–6).
- 150K-triangle active-character/hazard recommendation; mobile performance is a test
  target, not an inferred FPS claim (`에셋소싱.md` §0.1–0.2).
- All surfaces intentional and smooth; no swelling at limb joins. This is the user's
  October refinement and supersedes the previous subdivision-only geometry pass.

## Normal monsters — all mapped to asset spec §2 and design §7.2
| ID | Required identity | Silhouette features retained in rewrite |
|---|---|---|
| bookGhost | Floating book + ghost tail; tank | Bound spine, pages, ribbon bookmark, continuous curling wisp |
| pencilGhost | Pencil ghost; straight runner | Hexagonal pencil, ferrule, soft eraser, wooden point and graphite |
| paperGhost | Paper airplane + ghost face; weaving | Folded twin wings, pointed nose, central paper keel; not a bird/manta |
| zombie | Cartoon zombie; tank | Olive face, patched clothing, asymmetrical hair, compact heavy body |
| zombieDog | Four-legged zombie dog; straight | Single connected snout/head/nape/body shell, four thin legs, patch/collar |
| crow | Crow; weaving | Dark feather silhouette, beak, layered tapered wings, feet and tail |
| wireGolem | Cable golem; tank | Enclosed industrial torso, cable arms, insulated loop, core ring |
| sparkBot | Electric robot; straight | Compact metal shell, faceplate, twin electrical contacts |
| drone | Small drone; weaving | Low hull, two unmistakable rotor guards, propellers and landing skids |
| pufferfish | Spiny puffer; tank | Rounded fish body, spaced spines, fins, small ring mouth and tail |
| sharkFin | Shark; straight | Streamlined one-piece trunk, snout, dorsal/pectoral/caudal fins |
| jellyfish | Jellyfish; weaving | Smooth domed bell, seven thin flowing tentacles, no solid legs |
| ghoul | Ghoul; tank | Hooded shroud, small fangs, curled spectral lower body |
| wolf | Wolf; straight | Long canine snout, pointed ears, four thin legs, swept tail, cheek ruff |
| bat | Bat; weaving | Scalloped membrane wings, long ears, small fangs and narrow body |
| boneGolem | Bone golem; tank | Broad bone frame, rib cage, hollow skull eyes |
| skeletonSoldier | Skeleton soldier; straight | Visible ribs/pelvis/limbs, skull, helmet and blade |
| skullBird | Skeletal bird; weaving | Bone beak and wing ribs, skull-like face, feather/bone flight silhouette |

## Bosses — asset spec §3.1–3.3 and design §9
| ID | Identity and signature that must remain visible |
|---|---|
| ghostTeacher | Ghost teacher; chalk/blackboard shockwave and summoning; scholarly spectacles/board |
| ghostGirl | School ghost-story girl; long hair used as blocking walls, uniform, scream |
| giantZombie | Giant cartoon zombie; broad mass, slime barrage and ground slam, no gore |
| zombieKing | Crowned zombie king; royal silhouette, charging body, grave-wall motif |
| lightningGolem | Lightning golem; electrical conductor/coil silhouette, cyan shards and yellow strike |
| frankenstein | Frankenstein; flat-topped stitched head, neck contacts, electric barrage |
| kraken | Kraken; visibly multiple continuous tentacles, ink barrage and tidal wave |
| seaWitch | Sea witch; aquatic gown, coral/pearl crown, water and vortex magic |
| werewolfChief | Werewolf chief; upright canine, claws, fastest hunt charge and howl |
| dracula | Dracula; raised collar/bat cape, widow's peak, fangs, bat and red-magic motifs |
| skeletonKnight | Skeleton knight; visible skull, armor, shield and bone lance |
| skullKing | Skull king; skull crown/regalia, bone storm, royal bone/purple accents |

## Equipment — asset spec §5.2; design §12
| Runtime appearance | Required identity |
|---|---|
| ghost cape | Pale-blue translucent ghost fabric, floating/scalloped hem |
| patchwork hat | Ragged green cartoon hat; patches, not a recolored helmet |
| lightning hat | Yellow lightning-decorated helmet |
| coral hat | Sea witch coral-and-pearl crown |
| vampire cape | Crimson bat cape with raised collar |
| bone hat | Bone-colored skull-decorated crown |

The player species is unspecified by the original asset spec §1. The current shipped
rabbit hunter is described by `DESIGN.md` §1 and the art review, so retain the rabbit,
long ears, hunter clothing and attachments rather than inventing a new mascot.

## World and gameplay-prop matrix
Asset spec §7 specifies actual structures, not recolored scenery: night-school corridor
(lockers/windows/flickering lamps); ruined village (fences/derelict houses); lab corridor
(Tesla coils/gauges); underwater cave (coral/bubbles/caustic-like light); gothic castle
(candles/stained glass); bone-decorated stone corridor (torches).

Asset spec §4: LOW must read as a low jumpable object; HIGH as an overhead slide clearance;
PIT as an actual depression/dark opening; BLOCK as full lane blockage. Per-world props
should embody desks/fences/coral/bones, banners/pipes/chandeliers and lockers/barricades/stone.
No decorative protrusion may imply a new invisible collision.

Asset spec §5.1/6: currency coin, cyan gem, green heart/potion healing; player blue magic
(yellow critical); enemy ball/rod/shard shape taxonomy and authored boss colors preserved.
Asset spec §3.2: wall patterns use hair/graves/tentacles/bats/bones, waves remain jumpable,
markers keep their lane-learning function and warning timing unchanged.

## Explicit exclusions and provenance
No gameplay rebalance, replacement of 2D UI illustrations, sound sourcing, new shop,
accounts, monetization, merge or production deployment. Original geometry authored here;
no third-party character licensing claimed. GLB/Blend review exports are editable outputs
of the same runtime source, not claims of newly acquired production skeletal animations.
