"""Exact runtime GLB portrait framing; save before durability GO and render."""
import bpy,sys,json,hashlib
from pathlib import Path
from mathutils import Vector
args=sys.argv[sys.argv.index('--')+1:];root=Path(args[0]);blend=root/'witch-portrait-review.blend';manifest=root/'witch-portrait-manifest.json';sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
if '--render' not in args:
 bpy.ops.wm.open_mainfile(filepath=str(root/'creature-review.blend'))
 for o in bpy.data.collections['seaWitch'].objects:o.hide_render=False
 bpy.data.objects['review-ground'].hide_render=True
 scene=bpy.context.scene;scene.render.resolution_x=scene.render.resolution_y=1024;scene.cycles.samples=48;scene.cycles.use_denoising=False
 bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=str(blend),compress=True)
 manifest.write_text(json.dumps({'blendSha256':sha(blend),'glbSha256':sha(root/'seaWitch.glb'),'evidence':'exact factory GLB, no face decoration added by review'},indent=2));sys.exit(0)
m=json.loads(manifest.read_text());assert sha(blend)==m['blendSha256'];assert sha(root/'seaWitch.glb')==m['glbSha256'];bpy.ops.wm.open_mainfile(filepath=str(blend));scene=bpy.context.scene;camera=scene.camera;target=Vector((0,.055,2.56));records={}
for name,direction in [('portrait-profile',(1,0,0)),('portrait-front',(0,1,0)),('portrait-three-quarter',(.64,.77,0))]:
 camera.data.type='ORTHO';camera.data.ortho_scale=.72;camera.location=target+Vector(direction)*2;camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler();path=root/(name+'.png');scene.render.filepath=str(path);bpy.ops.render.render(write_still=True);records[path.name]={'sha256':sha(path),'glbSha256':m['glbSha256']}
(root/'portrait-pixel-manifest.json').write_text(json.dumps(records,indent=2))
