"""Geometry checks for the CC0-derived Witch study; not an art approval."""
import bpy,bmesh,json,sys,math
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
root=Path.cwd();directory=Path(sys.argv[sys.argv.index('--')+1]) if '--' in sys.argv else root/'.art/sea-witch-cc0-study-v4'
bpy.ops.wm.open_mainfile(filepath=str(directory/'sea-witch-cc0-study.blend'))
skin=bpy.data.objects['aquatic-cc0-skin'];bm=bmesh.new();bm.from_mesh(skin.data);boundary=sum(e.is_boundary for e in bm.edges);nonmanifold=sum(not e.is_manifold for e in bm.edges);assert boundary==0 and nonmanifold==0,(boundary,nonmanifold);bm.free()
counts={o.name:sum(len(p.vertices)-2 for p in o.data.polygons) for o in bpy.context.scene.objects if o.type=='MESH'};assert sum(counts.values())<=4940
clearances=[]
for side in ['r','l']:
 def tree(name):
  m=bpy.data.objects[name].data;return BVHTree.FromPolygons([v.co for v in m.vertices],[list(p.vertices) for p in m.polygons])
 targets=[tree('aquatic-cc0-sclera-'+side)]
 for role in ['iris','pupil']:
  mesh=bpy.data.objects['aquatic-cc0-'+role+'-'+side].data;mesh.calc_loop_triangles()
  for tri in mesh.loop_triangles:
   vs=[mesh.vertices[i].co for i in tri.vertices]
   for weights in [(1/3,1/3,1/3),(.6,.2,.2),(.2,.6,.2),(.2,.2,.6),(.5,.5,0),(0,.5,.5),(.5,0,.5)]:
    p=sum((v*w for v,w in zip(vs,weights)),Vector())
    for t in targets:
     hit,_,_,_=t.ray_cast(Vector((p.x,1,p.z)),Vector((0,-1,0)))
     if hit is not None:clearances.append(p.y-hit.y)
  targets.append(tree('aquatic-cc0-'+role+'-'+side))
assert min(clearances)>.00039,min(clearances)
report={'skinClosedManifold':True,'triangles':counts,'eyeTriangleInteriorProbes':len(clearances),'minimumEyeLayerClearance':min(clearances),'scope':'actual eye overlay vs helper surfaces only; original inner eyelid/socket faces intentionally not treated as collisions; visual integration still required'}
(directory/'geometry-validation.json').write_text(json.dumps(report,indent=2));print('PASS_CC0_WITCH_GEOMETRY',sum(counts.values()),min(clearances))
