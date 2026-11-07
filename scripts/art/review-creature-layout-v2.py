"""Exact runtime factory-layout GLBs, exported actual CameraController follow camera; save before --render.
blender -b -t 4 --python scripts/art/world-review.py -- .art/world-review [--render]
This is offline Cycles review, not browser evidence or runtime FPS measurement.
"""
import bpy,sys,json,hashlib
from pathlib import Path
from mathutils import Vector
args=sys.argv[sys.argv.index('--')+1:];root=Path(args[0]).resolve()
if '--render' not in args:
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
    scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=False
    scene.render.resolution_x=480;scene.render.resolution_y=600;scene.render.resolution_percentage=100
    scene.view_settings.view_transform='AgX';scene.view_settings.look='AgX - Medium High Contrast'
    scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.32
    # Review approximation of Game.setMood's normal linear fog (24 to76 m).
    scene.view_layers[0].use_pass_mist=True
    scene.world.mist_settings.start=24;scene.world.mist_settings.depth=52;scene.world.mist_settings.falloff='LINEAR'
    scene.use_nodes=True;nodes=scene.node_tree.nodes;nodes.clear()
    layer=nodes.new('CompositorNodeRLayers');fog=nodes.new('CompositorNodeMixRGB');output=nodes.new('CompositorNodeComposite')
    scene.node_tree.links.new(layer.outputs['Mist'],fog.inputs[0]);scene.node_tree.links.new(layer.outputs['Image'],fog.inputs[1]);scene.node_tree.links.new(fog.outputs[0],output.inputs[0])
    bpy.ops.object.camera_add(location=(0,7,4));camera=bpy.context.object;scene.camera=camera;camera.data.lens=27
    camera.rotation_euler=(Vector((0,-12,1.6))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.clip_end=100
    for name,pos,energy,size,color in [('key',(-4,3,9),1100,8,(1,.85,.68)),('fill',(4,-10,6),800,10,(.62,.79,1)),('distance',(0,-26,8),1000,12,(.72,.8,1))]:
     bpy.ops.object.light_add(type='AREA',location=pos);o=bpy.context.object;o.name=name;o.data.energy=energy;o.data.shape='DISK';o.data.size=size;o.data.color=color
     o.rotation_euler=(Vector((0,pos[1]-5,0))-o.location).to_track_quat('-Z','Y').to_euler()
    assets={}
    for row in json.loads((root/'inventory.json').read_text()):
     name=row['id'];before=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=str(root/f'world-{name}.glb'))
     objects=list(set(bpy.data.objects)-before);col=bpy.data.collections.new(name);scene.collection.children.link(col)
     for o in objects:
      for c in list(o.users_collection):c.objects.unlink(o)
      col.objects.link(o);o.hide_render=True
     assets[name]=(objects,row['bg'])
    bpy.ops.file.pack_all()
    for img in bpy.data.images:
     if img.type=='IMAGE' and img.size[0]>0: assert img.packed_file is not None, 'Unpacked texture: '+img.name
    bpy.ops.wm.save_as_mainfile(filepath=str(root/'layout-editable.blend'),compress=True)
    manifest={'blendSha256':hashlib.sha256((root/'layout-editable.blend').read_bytes()).hexdigest(),'glbs':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in root.glob('*.glb')}}
    (root/'layout.manifest.json').write_text(json.dumps(manifest,indent=2))
    print('SAVED_VERIFIED_RUNTIME_LAYOUT',len(assets))
    sys.exit(0)
manifest=json.loads((root/'layout.manifest.json').read_text())
assert hashlib.sha256((root/'layout-editable.blend').read_bytes()).hexdigest()==manifest['blendSha256']
for filename,digest in manifest['glbs'].items(): assert hashlib.sha256((root/filename).read_bytes()).hexdigest()==digest,filename
bpy.ops.wm.open_mainfile(filepath=str(root/'layout-editable.blend'))
scene=bpy.context.scene;fog=scene.node_tree.nodes.get('Mix')
assert fog is not None
assets={row['id']:(list(bpy.data.collections[row['id']].objects),row['bg']) for row in json.loads((root/'inventory.json').read_text())}
selected=next((arg.split('=',1)[1].split(',') for arg in args if arg.startswith('--ids=')),list(assets))
pixel_path=root/'pixel-manifest.json'
pixel_proofs=json.loads(pixel_path.read_text()) if pixel_path.exists() else {}
for name,(objects,bg) in assets.items():
 if name not in selected:continue
 for o in objects:o.hide_render=False
 scene.camera=next(o for o in objects if o.type=='CAMERA')
 color=tuple(((bg>>shift)&255)/255 for shift in [16,8,0])
 scene.world.node_tree.nodes['Background'].inputs['Color'].default_value=(*color,1)
 fog.inputs[2].default_value=(*(v*.32 for v in color),1)
 scene.render.filepath=str(root/f'world-{name}.png');bpy.ops.render.render(write_still=True)
 filename=f'world-{name}.png'
 pixel_proofs[filename]={'sha256':hashlib.sha256((root/filename).read_bytes()).hexdigest(),'glbSha256':manifest['glbs'][f'world-{name}.glb'],'blendSha256':manifest['blendSha256'],'scene':name,'evidence':'offline exact-runtime-camera Cycles; not browser/FPS'}
 pixel_path.write_text(json.dumps(pixel_proofs,indent=2))
 for o in objects:o.hide_render=True
