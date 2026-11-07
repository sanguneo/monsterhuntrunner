"""Exact GLB creature review, front -Z. Save checkpoint before --render.
blender -b -t 2 --python-exit-code 1 --python scripts/art/review-creatures-v2.py -- DIR
blender -b -t 2 --python-exit-code 1 --python scripts/art/review-creatures-v2.py -- DIR --render
"""
import bpy, sys, json, hashlib, math
from pathlib import Path
from mathutils import Vector
args=sys.argv[sys.argv.index('--')+1:]; root=Path(args[0]).resolve()
blend=root/'creature-review.blend'; manifest_path=root/'creature-review.manifest.json'
def sha(path): return hashlib.sha256(path.read_bytes()).hexdigest()
if '--render' in args:
    manifest=json.loads(manifest_path.read_text())
    assert sha(blend)==manifest['blendSha256'],'Stale/modified Blend'
    for name,digest in manifest['glbs'].items(): assert sha(root/(name+'.glb'))==digest, 'Stale GLB: '+name
    bpy.ops.wm.open_mainfile(filepath=str(blend))
    for name,count in manifest['meshCounts'].items(): assert sum(o.type=='MESH' for o in bpy.data.collections[name].objects)==count,name
else:
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
    scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=32;scene.cycles.use_denoising=False
    scene.render.resolution_x=768;scene.render.resolution_y=768;scene.render.resolution_percentage=100
    scene.world.color=(.20,.23,.28);scene.view_settings.view_transform='AgX'
    bpy.ops.object.camera_add(location=(3,-8,3));camera=bpy.context.object;camera.name='creature-review-camera';scene.camera=camera
    for name,loc,power,size,color in [('key',(-4,5,7),900,5,(1,.88,.73)),('fill',(5,2,4),600,4,(.68,.82,1)),('rim',(1,-4,6),1100,3,(.75,.82,1))]:
        bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.name=name;o.data.energy=power;o.data.shape='DISK';o.data.size=size;o.data.color=color;o.rotation_euler=(Vector((0,0,1))-o.location).to_track_quat('-Z','Y').to_euler()
    bpy.ops.mesh.primitive_plane_add(size=200);floor=bpy.context.object;floor.name='review-ground'
    mat=bpy.data.materials.new('review-neutral');mat.use_nodes=True;bs=mat.node_tree.nodes['Principled BSDF'];bs.inputs['Base Color'].default_value=(.16,.19,.23,1);bs.inputs['Roughness'].default_value=.85;floor.data.materials.append(mat)
    counts={}
    for path in sorted(root.glob('*.glb')):
        before=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=str(path));objects=list(set(bpy.data.objects)-before)
        count=sum(o.type=='MESH' for o in objects);assert count>0,path
        col=bpy.data.collections.new(path.stem);scene.collection.children.link(col)
        for ob in objects:
            for old in list(ob.users_collection):old.objects.unlink(ob)
            col.objects.link(ob);ob.hide_render=True
        counts[path.stem]=count
    assert counts,'No GLBs imported'
    bpy.ops.file.pack_all()
    for img in bpy.data.images:
        if img.type=='IMAGE' and img.size[0]>0: assert img.packed_file is not None, 'Unpacked texture: '+img.name
    bpy.ops.wm.save_as_mainfile(filepath=str(blend),compress=True)
    manifest={'blendSha256':sha(blend),'glbs':{n:sha(root/(n+'.glb')) for n in counts},'meshCounts':counts,'front':'runtime -Z -> Blender +Y','renderEvidence':'offline Cycles, not WebGL/FPS'}
    manifest_path.write_text(json.dumps(manifest,indent=2))
    print('SAVED_VERIFIED_CREATURE_CHECKPOINT',len(counts));sys.exit(0)
scene=bpy.context.scene;camera=scene.camera;floor=bpy.data.objects['review-ground']
# glTF Y-up -> Blender Z-up rotates runtime -Z into Blender +Y.
# Set review lights explicitly too, including when opening an earlier saved scene.
for light_name, location in [('key',(-4,5,7)),('fill',(5,2,4)),('rim',(1,-4,6))]:
    light=bpy.data.objects[light_name];light.location=location
    light.rotation_euler=(Vector((0,0,1))-light.location).to_track_quat('-Z','Y').to_euler()
selected=next((a.split('=',1)[1].split(',') for a in args if a.startswith('--ids=')),list(manifest['glbs']))
views=next((a.split('=',1)[1].split(',') for a in args if a.startswith('--views=')),['front','side','rear'])
if '--high' in args:scene.render.resolution_x=1024;scene.render.resolution_y=1024;scene.cycles.samples=48
rendered={}
for name in selected:
    objects=list(bpy.data.collections[name].objects)
    for ob in objects:ob.hide_render=False
    points=[ob.matrix_world @ v.co for ob in objects if ob.type=='MESH' for v in ob.data.vertices]
    lo=Vector(tuple(min(p[i] for p in points) for i in range(3)));hi=Vector(tuple(max(p[i] for p in points) for i in range(3)));center=(lo+hi)*.5;size=max(hi-lo)
    floor.location.z=lo.z-.025
    for view in views:
        camera.data.type='ORTHO';camera.data.ortho_scale=size*1.30
        direction={'front':(.65,2,.55),'side':(2,.15,.35),'rear':(-.65,-2,.55),'face':(0,2,.1),'distance':(.15,2,.4),'face-close':(.15,2,.08),'face-front':(0,2,0),'face-three-quarter':(1.2856,1.5321,0),'face-profile':(2,0,0)}[view]
        target=center;frame_size=size
        if view in ('face-close','face-front','face-three-quarter','face-profile'):
            face_heights={'ghostTeacher':2.73,'ghostGirl':2.56,'dracula':2.965,'frankenstein':2.75}
            assert name in face_heights,'Close-face target is not authored for '+name
            target=Vector((0,.2 if name=='frankenstein' else .045,face_heights[name]));frame_size=.8;camera.data.ortho_scale=.85 if name=='frankenstein' else .82
        camera.location=target+Vector(direction)*frame_size;camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler()
        if view=='distance':camera.data.ortho_scale=size*4.5
        # Distance view is a readability proxy. Actual runtime follow-camera layouts remain separate.
        path=root/(name+'-'+view+'.png');scene.render.filepath=str(path);bpy.ops.render.render(write_still=True);rendered[path.name]={'sha256':sha(path),'asset':name,'view':view,'glbSha256':manifest['glbs'][name]}
    for ob in objects:ob.hide_render=True
p=root/'pixel-manifest.json';old=json.loads(p.read_text()) if p.exists() else {};old.update(rendered);p.write_text(json.dumps(old,indent=2))
print('RENDERED_CURRENT_CREATURES',len(rendered))
