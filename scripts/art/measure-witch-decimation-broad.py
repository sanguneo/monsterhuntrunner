"""Empirical local Decimate influence check, not appearance acceptance."""
import bpy,bmesh,json
from pathlib import Path
from mathutils.bvhtree import BVHTree
root=Path.cwd();bpy.ops.wm.open_mainfile(filepath=str(root/'.art/sea-witch-cc0-study-v2/sea-witch-cc0-study.blend'));base=bpy.data.objects['aquatic-cc0-skin'];bm=bmesh.new();bm.from_mesh(base.data)
probes=[v.co.copy() for v in bm.verts if v.co.y>.07 and -.12<v.co.z<.10];bm.free();rows=[]
for inverse in [False,True]:
 o=base.copy();o.data=base.data.copy();bpy.context.collection.objects.link(o);group=o.vertex_groups.new(name='anatomical-apertures')
 for v in o.data.vertices:
  # Face in Blender+Y; strongest group on actual eye/nose/mouth zone.
  weight=1.0 if v.co.y>.07 and -.12<v.co.z<.10 else .05
  group.add([v.index],weight,'REPLACE')
 d=o.modifiers.new('measured-collapse','DECIMATE');d.ratio=.45;d.vertex_group=group.name;d.vertex_group_factor=1000.;d.invert_vertex_group=inverse;d.use_collapse_triangulate=True;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=d.name)
 tree=BVHTree.FromPolygons([v.co for v in o.data.vertices],[list(p.vertices) for p in o.data.polygons]);dist=[tree.find_nearest(p)[3] for p in probes];rows.append({'invert':inverse,'triangles':sum(len(p.vertices)-2 for p in o.data.polygons),'apertureProbes':len(probes),'maxDistance':max(dist),'meanDistance':sum(dist)/len(dist)})
 bpy.data.objects.remove(o,do_unlink=True)
(root/'.art/sea-witch-cc0-study-v2/decimation-influence-experiment.json').write_text(json.dumps(rows,indent=2));print(rows)
