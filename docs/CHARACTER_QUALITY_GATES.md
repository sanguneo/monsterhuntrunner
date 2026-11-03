# Hunter geometry and expression review gates

## Why global budgets are insufficient
A previous concept-guided checkpoint passed finite-buffer, triangle-count and global
pose bounds checks while its upper thighs visibly intersected the cream shirt/open
coat. Its wide white eye openings also read as staring. Neither condition is acceptable
merely because numerical tests pass. That checkpoint is superseded and is not approved
for publication.

## Garment/body contract
- Define the actual front, side and rear hem surfaces in the same rig coordinates as
  the articulated legs. Do not replace this with one scene-level bounding box.
- Remove hidden upper-thigh geometry where necessary; do not conceal penetrations with
  renderOrder, disabled depth testing, enlarged opaque overlays or camera-only offsets.
- Across gait/dash phases, jump ascent/apex/descent, slide entry/hold/exit, landing and
  lateral lean, leg samples above their local covered hem must remain behind actual
  shirt/coat triangles from front, rear and both sides.
- Below the hem, legs must emerge continuously: no air gap, exposed cut cap, abrupt
  flat truncation or knee bulge masquerading as a smooth joint.
- Check representative triangle interiors/edges as well as vertex samples. Report the
  sample set, geometric epsilon and worst measured margin; do not choose a tolerance
  only to admit an observed failure.

## Eye contract
- The concept calls for a warm, relaxed gaze, not maximum sclera exposure or glossy
  discs pasted on the head. Reduce aperture/white exposure and shape a calm upper lid.
- Eye/nose surfaces must follow the authored face and remain visibly outside it by a
  controlled shallow offset. An upper-only distance bound can silently accept buried
  features; a test must not skip invalid projection regions without reporting them.
- Check front, side, rear silhouettes and extreme slide orientation at full resolution.
  Catchlights and eyelids must not float independently of the face.

## Evidence required before closing
1. Exact code-authored final mesh checkpoint saved with its editable Blend scene.
2. Quantified pose-sampled garment and face checks, with their limitations stated.
3. Four full-resolution views, hip/face details, and run/slide pose evidence inspected
   by both author and an independent reviewer.
4. No known visible defect dismissed because a test passed. Live browser/device review
   remains separate from offline Cycles evidence.

Status: **known-defect offline gate closed after independent review, 2026-10-31**.
The earlier hollow underside and pointed roots are replaced by a continuous contained
pelvis. Fresh manifest-verified four-view idle, maximum-stride front/rear, slide front/rear
and combined-equipment slide views were inspected by author and independent reviewer.
No known thigh-over-cloth, exposed-root, floor-penetration or stiff hood-fin defect remains
in these inspected views. The eye aperture is calmer; a bright eye in the extreme rear
slide was separately verified as specular reflection, not a missing iris.

Measured final evidence:
- 56 pose configurations; 167,490 distinct garment coverage samples, 23,623 forward and
  142,832 reverse edge checks; minimum cloth clearance 0.016392 against fixed 0.010.
- 26,880 cap/adjacent-ring containment checks; minimum overlap 0.007878 against fixed
  0.003. Closed pelvis topology is checked separately from rendered appearance.
- Eight equipment pairs plus bare transitions; minimum visible height -0.017, maximum
  supported-slide height 0.896702. Idle/slide support is not a claim that both soles
  are pinned simultaneously, and gait flight is intentionally airborne.

This closes the named offline defects, not every possible animation/view or the separate
supported-browser/device gate. It is not a claim of user acceptance or commercial certification.

### Numerical limits retained in reports
The diagonal-view variable hem band (0.620–0.655 rig units, plus the transition epsilon)
is explicitly unclassified by the conservative directional mask. It is not counted as
an occlusion pass; bidirectional edge/triangle checks and rendered views remain necessary.
Face "visible" sample counters refer to front-facing normals, not proof that one eye
layer is unoccluded by another. Actual layer visibility and relaxed expression are judged
from full-resolution images independently of the attachment-distance test.

### Artifact integrity gate
The first pelvis export exposed a NORMAL/POSITION count mismatch, caught by the GLB
validator. Blender nevertheless returned shell status zero after its Python import error,
leaving an older Blend on disk. Those subsequent pictures are invalid stale evidence.
Normal attributes must be rebuilt after topology changes; attribute-count controls, strict
Python exit codes and exact GLB/Blend hash manifests now guard the render handoff.
