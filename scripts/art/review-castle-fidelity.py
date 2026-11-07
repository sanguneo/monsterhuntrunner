"""Exact backed-up Dracula GLB/Blend, neutral and cinematic material/shape inspection.
No mesh modifier, texture replacement, or offline-only material is applied.
"""
import bpy,sys,json,hashlib
from pathlib import Path
from mathutils import Vector
args=sys.argv[sys.argv.index('--')+1:];root=Path(args[0]).resolve()
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
manifest=json.loads((root/'creature-review.manifest.json').read_text())
blend=root/'creature-review.blend'
assert sha(blend)==manifest['blendSha256']
for name,digest in manifest['glbs'].items():assert sha(root/(name+'.glb'))==digest
bpy.ops.wm.open_mainfile(filepath=str(blend))
scene=bpy.context.scene;camera=scene.camera
objects=list(bpy.data.collections['dracula'].objects)
assert sum(o.type=='MESH' for o in objects)==manifest['meshCounts']['dracula']
for ob in objects:ob.hide_render=False
points=[ob.matrix_world@v.co for ob in objects if ob.type=='MESH' for v in ob.data.vertices]
lo=Vector(tuple(min(p[i] for p in points) for i in range(3)));hi=Vector(tuple(max(p[i] for p in points) for i in range(3)))
scene.render.resolution_x=1024;scene.render.resolution_y=1024;scene.render.resolution_percentage=100
scene.cycles.samples=48;scene.cycles.use_denoising=False
bpy.data.objects['review-ground'].location.z=lo.z-.025
if root.name in ['castle-authored-head-review','castle-portrait-v3-head','castle-anatomical-v4-head']:bpy.data.objects['review-ground'].hide_render=True
selected=next((a.split('=',1)[1].split(',') for a in args if a.startswith('--views=')),['neutral-front','neutral-side','neutral-face','moody-front','moody-face'])
result={}
for view in selected:
 mood=view.startswith('moody')
 lights=[('key',(-4,5,7),900,5,(1,.88,.73)),('fill',(5,2,4),600,4,(.68,.82,1)),('rim',(1,-4,6),1100,3,(.75,.82,1))]
 if mood:lights=[('key',(-3,4,5),650,3,(1,.87,.78)),('fill',(3,3,4),220,3,(.45,.61,.9)),('rim',(1,-3,5),950,2,(.8,.4,.44))]
 for name,loc,power,size,color in lights:
  light=bpy.data.objects[name];light.location=loc;light.data.energy=power;light.data.size=size;light.data.color=color;light.rotation_euler=(Vector((0,0,1.7))-light.location).to_track_quat('-Z','Y').to_euler()
 scene.world.color=(.07,.08,.12) if mood else (.20,.23,.28)
 scene.view_settings.exposure=-.1 if mood else 0
 center=(lo+hi)*.5;size=max(hi-lo);direction=Vector((.65,2,.55));camera.data.ortho_scale=size*1.22
 if view.endswith('side'):direction=Vector((2,.15,.35))
 if 'face' in view:
  center=Vector((.045,.045,2.965));size=.8;direction=Vector((-1.7,2,.12));camera.data.ortho_scale=.82
  if view.endswith('face-front'):direction=Vector((0,2,.03))
  if view.endswith('face-profile'):direction=Vector((-2,.03,.03))
 if 'portrait' in view:
  center=Vector((.045,.045,2.66));size=1.25;direction=Vector((-1.7,2,.15));camera.data.ortho_scale=1.25
 camera.data.type='ORTHO';camera.location=center+direction*size;camera.rotation_euler=(center-camera.location).to_track_quat('-Z','Y').to_euler()
 out=root/('dracula-'+view+'.png');scene.render.filepath=str(out);bpy.ops.render.render(write_still=True)
 result[out.name]={'sha256':sha(out),'glbSha256':manifest['glbs']['dracula'],'blendSha256':manifest['blendSha256'],'lighting':('cinematic'if mood else'neutral'),'evidence':'offline Cycles of exact runtime geometry and PBR maps; not WebGL/FPS'}
p=root/'fidelity-pixel-manifest.json';old=json.loads(p.read_text())if p.exists()else{};old.update(result);p.write_text(json.dumps(old,indent=2))
print('RENDERED_EXACT_FIDELITY_VIEWS',len(result))
