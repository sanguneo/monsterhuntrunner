"""Blender 4.3: import exact runtime GLBs, save editable scene, then render matched views.
Usage: blender -b -t 4 --python scripts/art/review.py -- ASSET_DIR [--render]
"""
import bpy, math, sys, hashlib, json
from pathlib import Path
from mathutils import Vector

args = sys.argv[sys.argv.index('--') + 1:]
root = Path(args[0]).resolve()
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
scene = bpy.context.scene
scene.render.engine = 'CYCLES'; scene.cycles.samples = 24; scene.cycles.use_denoising = False
scene.render.resolution_x = 512; scene.render.resolution_y = 512; scene.render.resolution_percentage = 100
scene.world.color = (0.22, 0.22, 0.22)
scene.view_settings.view_transform = 'AgX'
bpy.ops.object.camera_add(location=(4, 8, 3.5))
camera = bpy.context.object; scene.camera = camera; camera.data.type = 'ORTHO'
for name, loc, power, size, color in [('key',( -3,5,7),650,5,(1,.87,.71)),('fill',(4,1,4),350,4,(.7,.85,1)),('rim',(0,-4,5),750,3,(.78,.84,1))]:
    bpy.ops.object.light_add(type='AREA', location=loc)
    light=bpy.context.object; light.name=name; light.data.energy=power; light.data.shape='DISK'; light.data.size=size; light.data.color=color
    light.rotation_euler=(Vector((0,0,1))-light.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.mesh.primitive_plane_add(size=200)
floor=bpy.context.object; floor.name='review-ground'
mat=bpy.data.materials.new('review-neutral'); mat.use_nodes=True
mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.13,.17,.21,1)
mat.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.8
floor.data.materials.append(mat)
assets={}
for path in sorted(root.glob('*.glb')):
    if path.stem.startswith('world-'): continue
    before=set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(path))
    objects=list(set(bpy.data.objects)-before)
    collection=bpy.data.collections.new(path.stem); scene.collection.children.link(collection)
    for ob in objects:
        for c in list(ob.users_collection): c.objects.unlink(ob)
        collection.objects.link(ob); ob.hide_render=True
    assets[path.stem]=objects
assert assets and all(any(ob.type == 'MESH' for ob in objects) for objects in assets.values()), 'Empty imported asset'
bpy.ops.wm.save_as_mainfile(filepath=str(root/'runtime-review.blend'), compress=True)
# Written only after a successful import/save. Stale scenes cannot masquerade as new GLBs.
manifest = {'blendSha256': hashlib.sha256((root/'runtime-review.blend').read_bytes()).hexdigest(),
            'glbs': {name: hashlib.sha256((root/(name+'.glb')).read_bytes()).hexdigest() for name in assets},
            'meshCounts': {name: sum(ob.type == 'MESH' for ob in objects) for name, objects in assets.items()}}
(root/'runtime-review.manifest.json').write_text(json.dumps(manifest, indent=2))
if '--render' not in args: sys.exit(0)
selected = next((a.split('=',1)[1].split(',') for a in args if a.startswith('--ids=')), None)
for name, objects in assets.items():
    if selected and name not in selected: continue
    for ob in objects: ob.hide_render=False
    coords=[ob.matrix_world @ Vector(p) for ob in objects if ob.type=='MESH' for p in ob.bound_box]
    lo=Vector(tuple(min(p[i] for p in coords) for i in range(3)))
    hi=Vector(tuple(max(p[i] for p in coords) for i in range(3)))
    center=(lo+hi)/2; size=max(hi-lo)
    # Hunter idle is grounded to the same authored road datum; action motion stays airborne.
    floor.location.z=-.017 if name.startswith('hunter') else lo.z-.025
    # Same three-quarter view for all models and all revisions.
    camera.location=center+Vector((.65, -1.9 if name.startswith('hunter') else 1.9, .65))*size
    camera.rotation_euler=(center-camera.location).to_track_quat('-Z','Y').to_euler()
    camera.data.ortho_scale=size*1.38
    scene.render.filepath=str(root/(name+'.png'))
    bpy.ops.render.render(write_still=True)
    if '--side' in args:
        camera.location=center+Vector((1.8,.9,.6))*size
        camera.rotation_euler=(center-camera.location).to_track_quat('-Z','Y').to_euler()
        scene.render.filepath=str(root/(name+'-side.png'))
        bpy.ops.render.render(write_still=True)
    if name.startswith('hunter'):
        camera.location=center+Vector((-.65,1.9,.65))*size
        camera.rotation_euler=(center-camera.location).to_track_quat('-Z','Y').to_euler()
        scene.render.filepath=str(root/(name+'-rear.png'))
        bpy.ops.render.render(write_still=True)
    for ob in objects: ob.hide_render=True
