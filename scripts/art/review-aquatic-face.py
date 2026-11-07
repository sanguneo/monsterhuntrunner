"""Private exact runtime-GLB aquatic eye/jaw inspection, using a verified saved review scene.
No geometry/material alteration. Original full-model hashes accompany each close.
"""
import bpy,sys,json,hashlib
from pathlib import Path
from mathutils import Vector
args=sys.argv[sys.argv.index('--')+1:];root=Path(args[0]);name=args[1]
manifest=json.loads((root/'creature-review.manifest.json').read_text());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
assert sha(root/'creature-review.blend')==manifest['blendSha256'];assert sha(root/(name+'.glb'))==manifest['glbs'][name]
bpy.ops.wm.open_mainfile(filepath=str(root/'creature-review.blend'));scene=bpy.context.scene
for ob in bpy.data.collections[name].objects:ob.hide_render=False
points=[ob.matrix_world@v.co for ob in bpy.data.collections[name].objects if ob.type=='MESH' for v in ob.data.vertices]
bpy.data.objects['review-ground'].location.z=min(p.z for p in points)-.025
camera=scene.camera;camera.data.type='ORTHO';scene.render.resolution_x=768;scene.render.resolution_y=768;scene.cycles.samples=32
spec={'sharkFin':((0,.42,.035),.60),'pufferfish':((0,.34,.07),.70),'jellyfish':((0,.12,.08),.70),'kraken':((0,.36,1.05),1.12)}
target,scale=spec[name];target=Vector(target);camera.data.ortho_scale=scale
result={}
for view,direction in [('close-front',(.15,2,.15)),('close-side',(2,.4,.1))]:
 camera.location=target+Vector(direction)*scale;camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler();file=root/(name+'-'+view+'.png');scene.render.filepath=str(file);bpy.ops.render.render(write_still=True);result[file.name]={'sha256':sha(file),'glbSha256':manifest['glbs'][name],'view':view,'evidence':'offline neutral Cycles exact full runtime geometry/materials, close camera only'}
(root/(name+'-close-manifest.json')).write_text(json.dumps(result,indent=2))
