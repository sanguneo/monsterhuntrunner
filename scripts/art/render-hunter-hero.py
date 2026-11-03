"""Render the persisted, exact-runtime hunter at presentation resolution.
Usage: blender -b -t 4 --python scripts/art/render-hunter-hero.py -- ASSET_DIR
Requires ASSET_DIR/runtime-review.blend made by review.py (and backed up first).
This is offline Cycles CPU rendering, not browser runtime raytracing.
"""
import bpy
import sys
import json
import hashlib
from pathlib import Path
from mathutils import Vector

root = Path(sys.argv[sys.argv.index('--') + 1]).resolve()
manifest = json.loads((root / 'runtime-review.manifest.json').read_text())
assert hashlib.sha256((root / 'runtime-review.blend').read_bytes()).hexdigest() == manifest['blendSha256'], 'Blend differs from saved import manifest'
for name, digest in manifest['glbs'].items():
    assert hashlib.sha256((root / (name + '.glb')).read_bytes()).hexdigest() == digest, f'Stale Blend for {name}'
bpy.ops.wm.open_mainfile(filepath=str(root / 'runtime-review.blend'))
for name, count in manifest['meshCounts'].items():
    assert sum(ob.type == 'MESH' for ob in bpy.data.collections[name].objects) == count, f'Missing imported meshes: {name}'
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = 64
scene.cycles.use_denoising = False
scene.render.resolution_x = 1024
scene.render.resolution_y = 1024
scene.render.resolution_percentage = 100
if '--quick' in sys.argv:
    scene.cycles.samples=24
    scene.render.resolution_x=512
    scene.render.resolution_y=512
asset = next((a.split('=',1)[1] for a in sys.argv if a.startswith('--asset=')), 'hunter')
objects = list(bpy.data.collections[asset].objects)
assert any('continuous-inner-pelvis' in ob.name for ob in objects), 'Missing current inner pelvis in review scene; stale/failed import'
for ob in objects:
    ob.hide_render = False
coords = [ob.matrix_world @ Vector(p) for ob in objects if ob.type == 'MESH' for p in ob.bound_box]
lo = Vector(tuple(min(p[i] for p in coords) for i in range(3)))
hi = Vector(tuple(max(p[i] for p in coords) for i in range(3)))
center = (lo + hi) / 2
size = max(hi - lo)
# Matches HUNTER_ROAD_CONTACT_Y (explicit carpet-height datum), never an artificial hover gap.
bpy.data.objects['review-ground'].location.z = -.017
camera = scene.camera
camera.data.ortho_scale = size * 1.38
diagnostic = '--diagnostic' in sys.argv
views = [('front', (0,-2,.20)),('side',(2,0,.20)),('rear',(0,2,.20)),('three-quarter',(.65,-1.9,.65))] if diagnostic else [('front', (.65, -1.9, .65)), ('rear', (-.65, 1.9, .65))]
selected = next((a.split('=',1)[1].split(',') for a in sys.argv if a.startswith('--views=')), None)
for suffix, direction in views:
    if selected and suffix not in selected:
        continue
    camera.location = center + Vector(direction) * size
    camera.rotation_euler = (center - camera.location).to_track_quat('-Z', 'Y').to_euler()
    scene.render.filepath = str(root / f'{asset}-{"review" if diagnostic else "hero"}-{suffix}.png')
    bpy.ops.render.render(write_still=True)
