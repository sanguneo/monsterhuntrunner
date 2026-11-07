"""Original avian skull: hooked beak, real orbital/nasal voids, budgeted UV mesh."""
import bpy,bmesh,pathlib,json,math
root=pathlib.Path.cwd();out=root/'.art/skull-bird-authored';out.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bone=bpy.data.materials.new('Avian ivory');bone.diffuse_color=(.7,.63,.48,1);dark=bpy.data.materials.new('Avian cavity');dark.diffuse_color=(.10,.075,.08,1)
source=bpy.data.collections.new('EDITABLE_AVIAN_SOURCE');bpy.context.scene.collection.children.link(source)
bpy.ops.mesh.primitive_uv_sphere_add(segments=32,ring_count=24,location=(0,.31,.18));body=bpy.context.object;body.name='Authored_Avian_Skull';body.scale=(.095,.145,.085);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);body.data.materials.append(bone);body.data.materials.append(dark)
# Curved, swept upper beak rooted in the frontal cranium, not a human jaw.
verts=[];faces=[];ring_count=10
for y,width,z,depth in [(.335,.075,.175,.06),(.42,.06,.18,.055),(.495,.041,.155,.055),(.545,.022,.105,.043),(.557,.009,.056,.022),(.55,.001,.029,.002)]:
 for i in range(ring_count):
  angle=math.tau*i/ring_count;verts.append((width*math.cos(angle),y,z+depth*math.sin(angle)))
for row in range(5):
 for i in range(ring_count):a=row*ring_count+i;b=row*ring_count+(i+1)%ring_count;faces.append((a,b,b+ring_count,a+ring_count))
faces.extend([tuple(range(ring_count-1,-1,-1)),tuple(range(5*ring_count,6*ring_count))])
me=bpy.data.meshes.new('Hooked avian beak');me.from_pydata(verts,[],faces);me.update();ob=bpy.data.objects.new('Editable_rooted_beak',me);bpy.context.collection.objects.link(ob);ob.data.materials.append(bone)
bm=bmesh.new();bm.from_mesh(me);bmesh.ops.triangulate(bm,faces=list(bm.faces));bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(me);bm.free()
mod=body.modifiers.new('Beak cranial union','BOOLEAN');mod.operation='UNION';mod.solver='EXACT';mod.object=ob;bpy.context.view_layer.objects.active=body;bpy.ops.object.modifier_apply(modifier=mod.name);print("BOOLEAN_POLYGONS",len(body.data.polygons))
for coll in list(ob.users_collection):coll.objects.unlink(ob)
source.objects.link(ob);ob.hide_render=True;ob.hide_set(True)
for side in [-1,1]:
 v=[(side*.025,.235,.225),(side*.082,.26,.245),(side*.12,.34,.218),(side*.085,.405,.214),(side*.04,.365,.235),(side*.047,.22,.205),(side*.09,.32,.19)]
 f=[(0,1,2,3,4),(0,5,6,1),(1,6,2),(2,6,3),(3,6,5,4),(4,5,0)]
 me=bpy.data.meshes.new('Angular orbital roof');me.from_pydata(v,[],f);me.update();ridge=bpy.data.objects.new('Editable_rooted_orbital_crest',me);bpy.context.collection.objects.link(ridge);ridge.data.materials.append(bone)
 bm=bmesh.new();bm.from_mesh(me);bmesh.ops.triangulate(bm,faces=list(bm.faces));bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(me);bm.free()
 mod=body.modifiers.new('Rooted orbital roof union','BOOLEAN');mod.operation='UNION';mod.solver='EXACT';mod.object=ridge;bpy.context.view_layer.objects.active=body;bpy.ops.object.modifier_apply(modifier=mod.name);print("BOOLEAN_POLYGONS",len(body.data.polygons))
 for coll in list(ridge.users_collection):coll.objects.unlink(ridge)
 source.objects.link(ridge);ridge.hide_render=True;ridge.hide_set(True)
bpy.context.view_layer.objects.active=body
remesh=body.modifiers.new('Continuous authored maxilla and orbital roof','REMESH');remesh.mode='VOXEL';remesh.voxel_size=.003;bpy.ops.object.modifier_apply(modifier=remesh.name)
print('ROOT_UNION',len(body.data.polygons))
for side in [-1,1]:
 for kind,loc,scale in [('orbit',(side*.083,.327,.183),(.057,.063,.032)),('narial slit',(side*.033,.435,.195),(.018,.025,.009))]:
  bpy.ops.mesh.primitive_uv_sphere_add(segments=20,ring_count=12,location=loc);cut=bpy.context.object;cut.name=kind;cut.scale=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);cut.data.materials.append(bone);cut.data.materials.append(dark)
  for p in cut.data.polygons:p.material_index=1
  mod=body.modifiers.new('Actual avian '+kind,'BOOLEAN');mod.operation='DIFFERENCE';mod.solver='EXACT';mod.material_mode='INDEX';mod.object=cut;bpy.context.view_layer.objects.active=body;bpy.ops.object.modifier_apply(modifier=mod.name);print("BOOLEAN_POLYGONS",len(body.data.polygons))
  for coll in list(cut.users_collection):coll.objects.unlink(cut)
  source.objects.link(cut);cut.hide_render=True;cut.hide_set(True)
bpy.ops.mesh.primitive_cube_add(size=1,location=(0,.438,.133));cut=bpy.context.object;cut.name='Editable_beak_mouth_cleft';cut.scale=(.12,.095,.006);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);cut.data.materials.append(bone);cut.data.materials.append(dark)
for p in cut.data.polygons:p.material_index=1
mod=body.modifiers.new('Separate rooted upper and lower beak planes','BOOLEAN');mod.operation='DIFFERENCE';mod.solver='EXACT';mod.material_mode='INDEX';mod.object=cut;bpy.context.view_layer.objects.active=body;bpy.ops.object.modifier_apply(modifier=mod.name);print("BOOLEAN_POLYGONS",len(body.data.polygons))
for coll in list(cut.users_collection):coll.objects.unlink(cut)
source.objects.link(cut);cut.hide_render=True;cut.hide_set(True)
high=body.copy();high.data=body.data.copy();source.objects.link(high);high.name='Editable_Avian_High_Anatomy';high.hide_render=True;high.hide_set(True)
bpy.context.view_layer.objects.active=body;body.select_set(True);body.data.calc_loop_triangles();dec=body.modifiers.new('650-triangle avian anatomy budget','DECIMATE');dec.ratio=650/len(body.data.loop_triangles);dec.use_collapse_triangulate=True;dec.delimit={'MATERIAL'};bpy.ops.object.modifier_apply(modifier=dec.name)
bm=bmesh.new();bm.from_mesh(body.data);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);assert all(e.is_manifold for e in bm.edges)
seen=set();components=0;islands=[]
for vertex in bm.verts:
 if vertex in seen:continue
 components+=1;todo=[vertex];seen.add(vertex);component_vertices=[vertex]
 while todo:
  current=todo.pop()
  for edge in current.link_edges:
   other=edge.other_vert(current)
   if other not in seen:seen.add(other);todo.append(other);component_vertices.append(other)
 islands.append(component_vertices)
 print('COMPONENT',len(component_vertices),[round(min(v.co[k] for v in component_vertices),4) for k in range(3)],[round(max(v.co[k] for v in component_vertices),4) for k in range(3)])
largest=max(islands,key=len);removed_tip_vertices=0
for island in islands:
 if island is largest:continue
 # Voxel/decimation tip specks, never an intended bone or anatomical component.
 assert len(island)<=4 and max((a.co-b.co).length for a in island for b in island)<.02, ('Unexpected detached anatomy',len(island))
 removed_tip_vertices+=len(island);bmesh.ops.delete(bm,geom=island,context='VERTS')
assert removed_tip_vertices<=8
components=1
assert all(e.is_manifold for e in bm.edges)
bm.to_mesh(body.data);bm.free()
bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.uv.smart_project(angle_limit=math.radians(66),island_margin=.025);bpy.ops.object.mode_set(mode='OBJECT')
assert len(body.data.polygons)>250, 'Boolean anatomy collapsed; do not export invalid proof'
for p in body.data.polygons:p.use_smooth=True
body.data.update();body.data.calc_loop_triangles();uv=body.data.uv_layers.active.data;chunks=[]
for material in [0,1]:
 pos=[];normal=[];tex=[];indices=[];mapping={}
 for tri in body.data.loop_triangles:
  if body.data.polygons[tri.polygon_index].material_index!=material:continue
  for li in tri.loops:
   vi=body.data.loops[li].vertex_index;u=uv[li].uv;key=(vi,round(u.x,7),round(u.y,7))
   if key not in mapping:
    mapping[key]=len(pos)//3;v=body.data.vertices[vi];p=body.matrix_world@v.co;n=v.normal.normalized();pos.extend([p.x,p.z,-p.y]);normal.extend([n.x,n.z,-n.y]);tex.extend(u)
   indices.append(mapping[key])
 chunks.append({'p':pos,'n':normal,'uv':tex,'i':indices})
def rounded(x):
 if isinstance(x,float):return round(x,7)
 if isinstance(x,list):return [rounded(v) for v in x]
 if isinstance(x,dict):return {k:rounded(v) for k,v in x.items()}
 return x
import sys
sys.path.insert(0,str(root/'scripts/art'))
from indexed_geometry_storage import pack_records
text="// Generated original indexed anatomy; exact Float32/Uint16 storage.\nimport { createPackedIndexedAnatomy } from './sea-skull-packed-geometry';\nconst data="+json.dumps(pack_records(rounded(chunks)),separators=(',',':'))+";\nexport function createAuthoredBirdSkull(){return data.map(createPackedIndexedAnatomy);}\n"
(root/'src/visual/creatures/v2/skull-bird-authored-geometry.ts').write_text(text);stats={'triangles':len(body.data.loop_triangles),'nonManifoldEdges':0,'connectedComponents':components,'removedVoxelTipArtifactVertices':removed_tip_vertices,'cavityTriangles':len(chunks[1]['i'])//3};(out/'avian-anatomy-manifest.json').write_text(json.dumps(stats,indent=2));bpy.ops.wm.save_as_mainfile(filepath=str(out/'avian-editable-authoring.blend'));print('VALIDATED_AVIAN_ANATOMY',stats)
