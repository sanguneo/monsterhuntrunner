"""Compile authored mantle/eight arms/crest into one watertight runtime surface.
Run after export-kraken-authoring.ts. No cups or face features are unioned.
"""
import bpy, pathlib, json, math, hashlib
root=pathlib.Path.cwd(); out=root/'.art/kraken-authored'; out.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(out/'kraken-authoring-input.glb'))
parts=[o for o in bpy.context.scene.objects if o.type=='MESH' and (o.name.startswith('kraken-continuous-mantle') or o.name.startswith('kraken-rooted-tentacle-') or o.name.startswith('kraken-broad-anatomical-crest'))]
assert len(parts)==11,[(o.name,o.type) for o in parts]
# Editable authoring meshes remain in the Blend, hidden in a source collection.
source=bpy.data.collections.new('EDITABLE_AUTHORING_SOURCE');bpy.context.scene.collection.children.link(source)
for obj in list(bpy.context.scene.objects):
    if obj.type!='MESH':continue
    clone=obj.copy();clone.data=obj.data.copy();source.objects.link(clone);clone.matrix_world=obj.matrix_world.copy();clone.hide_render=True;clone.hide_set(True)
source.hide_render=True
bpy.ops.object.select_all(action='DESELECT')
for obj in parts:obj.select_set(True)
bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.join();body=bpy.context.object;body.name='Kraken_Continuous_Authored_Surface'
bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)
remesh=body.modifiers.new('Organic branch union — voxel 0.022','REMESH');remesh.mode='VOXEL';remesh.voxel_size=.022;remesh.use_smooth_shade=True
bpy.ops.object.modifier_apply(modifier=remesh.name)
relax=body.modifiers.new('Gentle anatomical relaxation','SMOOTH');relax.factor=.48;relax.iterations=5;bpy.ops.object.modifier_apply(modifier=relax.name)
body.data.calc_loop_triangles();before=len(body.data.loop_triangles)
dec=body.modifiers.new('Runtime curvature-preserving budget','DECIMATE');dec.ratio=min(1,10000/before);dec.use_collapse_triangulate=True;bpy.ops.object.modifier_apply(modifier=dec.name)
# Actual recessed orbital bowls, not colored polygon decals. Carve after organic union.
from mathutils import Vector
sockets=[]
for side in [-1,1]:
    origin=Vector((side*.265,8,1.28)); direction=Vector((0,-1,0))
    inv=body.matrix_world.inverted();hit,loc,n,face=body.ray_cast(inv@origin,inv.to_3x3()@direction)
    assert hit, 'Orbital support missing'
    loc=body.matrix_world@loc
    center=loc+Vector((0,.018,-.015))
    sockets.append([center.x,center.z,-center.y])
    # The upper orbital mantle is real continuous skin, not an exposed lens bead.
    # Push a broad tapered roof from the existing surface; retain lower bowl/root mass.
    for vertex in body.data.vertices:
        co=body.matrix_world@vertex.co
        if co.y<center.y-.08:continue
        weight=math.exp(-((co.x-center.x)/.175)**2-((co.z-center.z-.065)/.072)**2)
        co.y+=.075*weight
        vertex.co=body.matrix_world.inverted()@co
    body.data.update()
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=12,location=center)
    cutter=bpy.context.object;cutter.name='Orbital bowl cutter';cutter.scale=(.147,.115,.053)
    cutter.rotation_euler.y=side*-.20
    bpy.context.view_layer.objects.active=cutter;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    cutter.hide_render=True
    bpy.context.view_layer.objects.active=body
    boolean=body.modifiers.new('True recessed orbital bowl','BOOLEAN');boolean.operation='DIFFERENCE';boolean.solver='EXACT';boolean.object=cutter
    bpy.ops.object.modifier_apply(modifier=boolean.name)
    bpy.data.objects.remove(cutter,do_unlink=True)
for p in body.data.polygons:p.use_smooth=True
body.data.update();body.data.calc_loop_triangles()
# Validate closed manifold, one connected component and finite geometry.
import bmesh
bm=bmesh.new();bm.from_mesh(body.data);nonmanifold=sum(not e.is_manifold for e in bm.edges);assert nonmanifold==0,nonmanifold
seen=set();components=0;component_sets=[]
for v in bm.verts:
    if v in seen:continue
    components+=1;todo=[v];seen.add(v);part={v}
    while todo:
        w=todo.pop()
        for e in w.link_edges:
            q=e.other_vert(w)
            if q not in seen:seen.add(q);todo.append(q);part.add(q)
    component_sets.append(part)
print("COMPONENT_SIZES", sorted([len(c) for c in component_sets],reverse=True),flush=True)
component_sets.sort(key=len,reverse=True)
removed=sum(len(c) for c in component_sets[1:])
assert all(len(c)<=8 for c in component_sets[1:]),[len(c) for c in component_sets]
# Decimation can collapse voxel-tip cells into doubled zero-volume triangles.
# Remove only those explicitly tiny disconnected remnants, never an authored arm.
if removed:bmesh.ops.delete(bm,geom=[v for c in component_sets[1:] for v in c],context='VERTS')
assert all(e.is_manifold for e in bm.edges)
bm.to_mesh(body.data);bm.free();body.data.update();body.data.calc_loop_triangles();components=1

bpy.context.view_layer.objects.active=body;body.select_set(True)
bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.uv.smart_project(angle_limit=math.radians(66),island_margin=.025);bpy.ops.object.mode_set(mode='OBJECT')
body.data.calc_loop_triangles();positions=[];normals=[];uvs=[];indices=[];vertex_map={}
uv_layer=body.data.uv_layers.active.data
for tri in body.data.loop_triangles:
    for loop_index in tri.loops:
        vi=body.data.loops[loop_index].vertex_index;uv=uv_layer[loop_index].uv
        key=(vi,round(uv.x,7),round(uv.y,7))
        if key not in vertex_map:
            vertex_map[key]=len(positions)//3;v=body.data.vertices[vi]
            p=body.matrix_world@v.co;n=(body.matrix_world.to_3x3()@v.normal).normalized()
            positions.extend([p.x,p.z,-p.y]);normals.extend([n.x,n.z,-n.y]);uvs.extend([uv.x,uv.y])
        indices.append(vertex_map[key])
assert all(math.isfinite(x) for x in positions+normals)
assert len(indices)//3<=11400
fmt=lambda a:json.dumps([round(x,7) if isinstance(x,float) else x for x in a],separators=(',',':'))
import sys
sys.path.insert(0,str(root/'scripts/art'))
from indexed_geometry_storage import pack_records
payload=pack_records({'p':[round(x,7) for x in positions],'n':[round(x,7) for x in normals],'uv':[round(x,7) for x in uvs],'i':indices})
ts="// Generated by original author-kraken-union.py; exact Float32/Uint16 storage.\nimport { createPackedIndexedAnatomy } from './sea-skull-packed-geometry';\n"
ts+='export const krakenAuthoredEyeSockets='+fmt(sockets)+' as const;\nconst data='+json.dumps(payload,separators=(',',':'))+';\nexport function createAuthoredKrakenGeometry(){return createPackedIndexedAnatomy(data); }\n'
(root/'src/visual/creatures/v2/kraken-authored-geometry.ts').write_text(ts)
manifest={'inputSHA256':hashlib.sha256((out/'kraken-authoring-input.glb').read_bytes()).hexdigest(),'vertices':len(positions)//3,'triangles':len(indices)//3,'connectedComponents':components,'nonManifoldEdges':nonmanifold,'uvLayout':'Smart UV 66deg, margin 0.025, seam-split vertices with shared smooth normals','voxelSize':.022,'relaxIterations':5,'preDecimateTriangles':before,'removedCollapsedTipVertices':removed}
(out/'kraken-union-manifest.json').write_text(json.dumps(manifest,indent=2))
bpy.ops.wm.save_as_mainfile(filepath=str(out/'kraken-editable-authoring.blend'))
print('VALIDATED_AUTHORED_KRAKEN',manifest)
