# HISTORICAL rejected row-built face workflow, retained for recovery/provenance.
# Current: author-sea-witch-cc0-study.py + prepare-sea-witch-cc0-runtime.py; validate-witch-cc0-study.py.
"""Evaluated eye/skin clearance diagnostic. A sampled guard, not exhaustive intersection certification."""
import bpy,bmesh,math,json,pathlib,hashlib
from mathutils import Vector
root=pathlib.Path.cwd();out=root/'.art/sea-witch-face-authored';source=out/'aquatic-face-editable.blend'
bpy.ops.wm.open_mainfile(filepath=str(source));me=bpy.data.objects['aquatic-face-skin'].data;me.calc_loop_triangles();bad=[];checked=0
for tri in me.loop_triangles:
 vs=[me.vertices[i].co for i in tri.vertices]
 for w in [(1/3,1/3,1/3),(.5,.5,0),(.5,0,.5),(0,.5,.5)]:
  p=sum((vs[i]*w[i] for i in range(3)),Vector());x,y,z=p
  if z>=-.092:continue
  side=1 if x>0 else -1;r2=((x-side*.074)/.038)**2+((y-.04)/.029)**2+((z+.092)/.037)**2;checked+=1
  if r2<.998:bad.append(r2)
assert not bad,('Skin triangle samples inside seated eye',len(bad),min(bad))
bm=bmesh.new();bm.from_mesh(me);boundary={v for e in bm.edges if e.is_boundary for v in e.verts};radii=[((v.co.x-(.074 if v.co.x>0 else -.074))/.038)**2+((v.co.y-.04)/.029)**2+((v.co.z+.092)/.037)**2 for v in boundary];assert min(radii)>1.01
report={'sourceBlendSHA256':hashlib.sha256(source.read_bytes()).hexdigest(),'generatedGeometrySHA256':hashlib.sha256((root/'src/visual/creatures/v2/sea-witch-authored-face.ts').read_bytes()).hexdigest(),'sampledFrontSkinPoints':checked,'insideEyeSamples':len(bad),'insideThresholdRadiusSquared':.998,'boundaryVertices':len(boundary),'minimumBoundaryRadiusSquared':min(radii),'authoredZClearance':.002,'limitations':'Vertices, triangle centroids and edge midpoints only; actual close pixels still mandatory.'};bm.free();(out/'eye-clearance-validation.json').write_text(json.dumps(report,indent=2));print('PASS EVALUATED_AQUATIC_EYE_CLEARANCE',report)
