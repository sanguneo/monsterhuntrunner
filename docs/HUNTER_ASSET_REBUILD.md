# Rabbit hunter and equipment rebuild

> **Concept-derived replacement in visual QA.** The 14:33 UTC version was rejected
> for a stiff, LEGO-like posture. It is not the publication candidate. The new source
> follows the generated rabbit concept: asymmetrical ears, expressive eyes, dropped
> shoulders, an open hooded coat, curved bare forearms and visible bent legs.
> This is a runtime geometry translation, not a claim to reproduce offline fur strands.

Source requirements: `에셋소싱.md` §1 and §5.2; `DESIGN.md` §1/6;
`docs/ASSET_IDENTITY_MATRIX.md`. The original spec leaves the player species open;
the shipped rabbit hunter is preserved, not replaced by a different animal.

- The head and muzzle are one continuous deformed surface. Cream muzzle and eye-mask regions
  are vertex colors, so there are no pasted-on spherical cheeks.
- Long rabbit ears are continuous curved volumes with painted inner-ear regions;
  one stays upright and one has a broad genuinely folded flap, following the hero concept.
- Slim articulated arms have short relaxed sleeves, rolled cuffs and continuous
  curved bare forearm/hand shells, without spherical shoulder or wrist joints.
  The coat upper perimeter slopes down at the sides; sleeve centerlines curve outward
  and down into oblique cuffs rather than forming squared horizontal shoulder caps.
- Each compact boot is a single tailored shell with integrated toe, ankle and sole.
- The open hooded coat, shoulder strap, backpack, leather satchel and compass charm retain
  the hunter role. A short rounded tail replaces the previous elongated canine-like tail.
- Ghost cape: translucent pale-blue cloth, scalloped hem and spectral embroidery.
- Zombie hat: asymmetrical fabric crown, irregular ragged brim and sewn patch.
- Lightning helmet: fitted metal shell, rim and readable lightning crest.
- Sea crown: branching coral and pearls, not a recolored ordinary crown.
- Dracula cape: crimson bat-scalloped cloth, raised dark collar and jewel clasp.
- Skull crown: bone regalia and a continuous skull cameo with inset eye sockets.

Equipment is preallocated and swapped by visibility. Animation roots, public methods,
pose states and attachment sockets remain compatible. This is a code-authored rig of
articulated groups, not a claim that new skeletal animation clips have been delivered.
The exported GLBs and editable Blender review scene reproduce the runtime geometry.

The prior technical checkpoint is historical and was rejected aesthetically. Current
geometry and pose measurements are generated in `.art/hunter-concept/inventory.json`.
The current bare hunter is 19,824 triangles / 49 draws; maximum combined crown+cape
is 27,248 triangles / 58 draws. Supported slide height is approximately 0.897.
Tests enforce bare hunter <=20k triangles, all combined gear <=30k, resource reuse,
and all eight hat/cape combinations below the 1.05 overhead slide clearance.
Actual rendered front/rear cosmetic and pose review is required after Library backup.
No browser/FPS test is claimed where the browser is sandbox-blocked.

## Pose compatibility
The visual rig reclines into a feet-first slide; physics, timing and hitboxes are unchanged.
A regression test checks all eight hat/cape combinations for floor clearance, overhead
clearance and feet-first orientation. The new concept changes silhouette and garment
construction; previous cape-intersection review is not treated as proof for the new body.

The dedicated `scripts/art/export-hunter-poses.ts` exports all cosmetics plus run, jump,
slide, dash, combined gear and combined-gear slide. These use the actual public
`PlayerModel.update` implementation, not a second presentation rig.

## Face attachment and reproducible review
Close slide-rear inspection exposed detached-looking eye/lid plates and nose corners.
The eye layers, eyelids, eyebrows, nose base and smile now conform to the same analytic
surface used to author the continuous head. This is a one-time construction operation;
there are no per-frame raycasts or geometry allocations. Tests raycast the actual head
triangles, enforce two-sided attachment bounds, require nonzero front-facing samples,
and check finite unit normals and matching attribute counts. Front-facing samples
are not a substitute for checking the visible iris and eyelids in rendered pixels.

## Garment continuity and contact gates
The broad cream shirt hem no longer collapses to a point. Hidden upper-thigh topology
is removed rather than rendered over the coat. A single closed, contained inner pelvis
connects both moving root rings underneath the garment; it is not two spherical joints.
A closed-shell manifold/containment test samples both caps and adjacent rings across
56 poses, with fixed minimum overlap 0.003. The current measured minimum is 0.007878.
Independent garment tests sample exact mesh triangles from cardinal, diagonal and
elevated directions, plus bidirectional edge crossings. Current minimum cloth clearance
is 0.016392 against the fixed 0.010 requirement. The report explicitly identifies the
variable-hem transition band and symmetric numerical UV-seam ray tolerance.
These numbers do not prove natural-looking attachment: low-front slide pixels remain
an independent publication gate.

The explicit visual road-contact datum is -0.017 (carpet height), with the road base at
-0.025; this is not a claim about every decorative floor inlay. Cached exact sole
vertices support idle and slide without changing the Player collision root. Sliding
legs rotate around their attachment caps; cape gathering follows torso recovery.
Exact-vertex tests cover entry/hold/exit, landing, bare/equipped cases, airborne motion,
and repeated transition/reset idempotence. Airborne poses are not artificially grounded.

`pnpm art:qa` writes machine-readable face, garment, ground and anatomy reports.
Validation exports include exact update sequences and test pose IDs in inventory.json.

## Artifact integrity and remaining review
A cap-extension bug left NORMAL shorter than POSITION; strict GLB validation caught it.
The normal buffer is now recreated after adding cap vertices, and regression tests check
all vertex-attribute counts. Blender save jobs use `--python-exit-code 1`, so import
exceptions cannot silently preserve an old scene as a successful export. Successful
save manifests bind the Blend SHA256, every source GLB SHA256 and imported mesh counts.
The hero renderer rejects stale manifests and requires the actual inner-pelvis mesh.

**Named-defect visual gate closed after independent review (2026-10-31):**
current manifest-verified renders were inspected by the author, integration owner and
independent reviewer. Forty current images cover:
- Bare hunter: front, side, rear and three-quarter at 1024px/64 samples.
- Exact `run-6` and supported `slide`: front/rear at 1024px/64 samples.
- `run-18`, `dash-6`, jump rise/apex/fall, slide entry/exit and landing: front/rear
  at 512px/24 samples (the jump pose exports keep collision-root Y=0 rather than
  simulate the gameplay vertical trajectory).
- All six equipped variants, combined crown/cape and combined slide: front/rear
  at 512px/24 samples.

The reviewed defects—upper thighs showing over clothing, exposed pointed leg roots,
wide staring apertures, lifted hood fin and unsupported idle/slide—are corrected in
these views. A slight second-foot lift in the asymmetrical idle stance is intentional;
support is measured from actual boot soles, not arbitrary body or cape points.
The broad lower body visible from underneath during slide remains a deliberate
continuous volume, not a hidden void. No further aesthetic redesign was authorized
as part of closing these specific defects.

`pixel-review.json` binds all 40 PNG hashes to their exact source GLB and saved Blend
hashes. Archive contact sheets are `final-hunter-review.jpg`,
`final-equipment-review.jpg` and `hunter-validation/final-action-review.jpg`.
This is finite sampled visual/geometry evidence, not proof for every continuous-time
pose or browser GPU presentation. Browser runtime/FPS validation remains blocked;
o such success is claimed. Earlier renders from failed/stale imports are superseded.

Reference: `docs/art-reference/hunter-concept.png` and its README. Review scenes
are the exact exported runtime meshes, not a separate beauty-only model. The helper
`scripts/art/render-hunter-hero.py` opens the saved editable review Blend and produces
1024px, 64-sample front/rear Cycles CPU hero views. Cosmetic/pose coverage uses
512px, 24-sample views. Offline Cycles is not evidence of browser raytracing or FPS.
