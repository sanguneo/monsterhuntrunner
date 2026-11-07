"""Original species-specific fish body cavities, preserved silhouettes, editable cutters.
Inputs are the authored pre-cavity bodies, not regenerated from this module's output.
"""
import bpy,bmesh,json,pathlib,math,hashlib,struct,base64
from mathutils import Vector
root=pathlib.Path.cwd();out=root/'.art/sea-fish-authored';compiled={};stats={}
def packed(a,kind):return base64.b64encode(struct.pack('<'+kind*len(a),*a)).decode()
def keep(ob,coll):
 for c in list(ob.users_collection):c.objects.unlink(ob)
 coll.objects.link(ob);ob.hide_render=True;ob.hide_set(True)
for species in ['sharkFin','pufferfish']:
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
 bpy.ops.import_scene.gltf(filepath=str(out/f'{species}-body-input.glb'))
 body=next(o for o in bpy.context.scene.objects if o.type=='MESH');bpy.context.view_layer.objects.active=body;body.select_set(True);bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)
 # Weld seams before solid Boolean operations; original shape/normals remain inspectable.
 bm=bmesh.new();bm.from_mesh(body.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.000001);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(body.data);bm.free()
 source=bpy.data.collections.new(species+'_EDITABLE_SOURCE');bpy.context.scene.collection.children.link(source)
 original=body.copy();original.data=body.data.copy();source.objects.link(original);original.hide_render=True;original.hide_set(True)
 skin=bpy.data.materials.new(species+'_outer_skin');skin.diffuse_color=(.15,.32,.46,1) if species=='sharkFin' else (.72,.32,.07,1)
 cavity=bpy.data.materials.new(species+'_inner_cavity');cavity.diffuse_color=(.045,.025,.027,1)
 body.data.materials.clear();body.data.materials.append(skin);body.data.materials.append(cavity)
 for p in body.data.polygons:p.material_index=0
 # Sculpt supported brow planes into the existing body before carving the socket.
 for v in body.data.vertices:
  x,z,y=v.co.x,v.co.y,v.co.z # Blender front +Y; runtime front -Z
  if species=='pufferfish' and z>.12:
   w=math.exp(-((abs(x)-.18)/.105)**2-((y-.17)/.075)**2)
   v.co.y+=.035*w
  elif species=='sharkFin' and z>.25:
   w=math.exp(-((abs(x)-.115)/.07)**2-((y-.115)/.045)**2-((z-.43)/.15)**2)
   v.co.x+=math.copysign(.018*w,x)
 body.data.update();sockets=[]
 def cut(name,loc,scale,tilt=0,segments=24,rings=12):
  bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=rings,location=loc);ob=bpy.context.object;ob.name=name;ob.scale=scale;ob.rotation_euler.y=tilt
  bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);ob.data.materials.append(skin);ob.data.materials.append(cavity)
  for p in ob.data.polygons:p.material_index=1
  bpy.context.view_layer.objects.active=body;mod=body.modifiers.new(name,'BOOLEAN');mod.operation='DIFFERENCE';mod.solver='EXACT';mod.material_mode='INDEX';mod.object=ob;bpy.ops.object.modifier_apply(modifier=mod.name);keep(ob,source)
 for side in [-1,1]:
  if species=='pufferfish':origin=Vector((side*.18,3,.105));direction=Vector((0,-1,0))
  else:origin=Vector((side*3,.43,.085));direction=Vector((-side,0,0))
  hit,loc,n,face=body.ray_cast(body.matrix_world.inverted()@origin,direction);assert hit
  loc=body.matrix_world@loc
  if species=='pufferfish':loc.y+=.014;loc.z-=.015;scale=(.086,.095,.036);tilt=side*-.24
  else:loc.x+=side*.008;loc.z-=.010;scale=(.055,.064,.019);tilt=0
  sockets.append([loc.x,loc.z,-loc.y]);cut('Recessed orbital bowl',loc,scale,tilt)
 if species=='sharkFin':
  # Broad actual mouth removes central lower snout volume, leaving upper/lower jaw roots.
  cut('True upper-lower jaw cavity',(0,.43,-.06),(.22,.205,.052),segments=32,rings=12)
  for side in [-1,1]:
   for j in range(4):
    z=.24-j*.048;origin=Vector((side*3,z,.025));hit,loc,n,f=body.ray_cast(origin,Vector((-side,0,0)));assert hit
    cut('Recessed branchial slit',loc+Vector((side*.004,0,0)),(.015,.009,.073),segments=12,rings=8)
 else:
  # Small curved, downturned teleost mouth; no stamped pentagonal beak.
  cut('Small downturned fish oral cavity',(0,.427,-.047),(.060,.058,.020),segments=24,rings=10)
 high=body.copy();high.data=body.data.copy();source.objects.link(high);high.hide_render=True;high.hide_set(True)
 bpy.context.view_layer.objects.active=body;body.data.calc_loop_triangles();target=2500 if species=='sharkFin' else 1650
 dec=body.modifiers.new('Curvature and material constrained runtime budget','DECIMATE');dec.ratio=min(1,target/len(body.data.loop_triangles));dec.delimit={'MATERIAL'};dec.use_collapse_triangulate=True;bpy.ops.object.modifier_apply(modifier=dec.name)
 if species=='pufferfish':
  # Add topology only around the evaluated orbital skin; large original body triangles
  # can cross a globe even when every original corner lies outside its footprint.
  bm=bmesh.new();bm.from_mesh(body.data);edges=set()
  for face in bm.faces:
   if face.material_index!=0:continue
   for socket in sockets:
    cx,cz=socket[0],socket[1]+.015
    if max(v.co.x for v in face.verts)>=cx-.085 and min(v.co.x for v in face.verts)<=cx+.085 and max(v.co.z for v in face.verts)>=cz-.060 and min(v.co.z for v in face.verts)<=cz+.060 and min(v.co.y for v in face.verts)>.15:edges.update(face.edges)
  bmesh.ops.subdivide_edges(bm,edges=list(edges),cuts=1,use_grid_fill=True)
  bmesh.ops.triangulate(bm,faces=list(bm.faces));bm.to_mesh(body.data);bm.free()
 # Evaluated outer skin and shared orbital rim must cover the actual curved eyeball,
 # including the pupil cap. Interior cavity vertices stay recessed, not filled.
 outer_vertices={v for poly in body.data.polygons if poly.material_index==0 for v in poly.vertices}
 for side,socket in zip([-1,1],sockets):
  for vi in outer_vertices:
   v=body.data.vertices[vi];co=body.matrix_world@v.co
   if species=='pufferfish':
    cx,cy,cz=socket[0],-socket[2]-.060,socket[1]+.015
    dx,dz=co.x-cx,co.z-cz;angle=side*.24
    u=math.cos(angle)*dx+math.sin(angle)*dz;w=-math.sin(angle)*dx+math.cos(angle)*dz
    q=(u/.060)**2+(w/.035)**2
    if q<1.8 and co.y>cy-.12:
     weight=1 if q<=1.2 else max(0,(1.8-q)/.6)**2*(3-2*max(0,(1.8-q)/.6))
     target=cy+.038*math.sqrt(max(0,1-q))+.010
     # Smooth maximum retains the original convex skin instead of pulling the
     # orbital surround down into a flat annular dent.
     delta=target-co.y
     co.y+=.5*(delta+math.sqrt(delta*delta+.008*.008))*weight
   else:
    cx,cy,cz=socket[0]-side*.040,-socket[2],socket[1]
    q=((co.y-cy)/.050)**2+((co.z-cz)/.028)**2
    if q<1 and co.x*side>cx*side-.01:co.x=side*max(co.x*side,cx*side+.041*math.sqrt(1-q)+.005)
   v.co=body.matrix_world.inverted()@co
 bm=bmesh.new();bm.from_mesh(body.data);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);assert all(e.is_manifold for e in bm.edges),species
 seen=set();components=0
 for v in bm.verts:
  if v in seen:continue
  components+=1;seen.add(v);todo=[v]
  while todo:
   p=todo.pop()
   for e in p.link_edges:
    q=e.other_vert(p)
    if q not in seen:seen.add(q);todo.append(q)
 assert components==1,(species,components)
 bm.to_mesh(body.data);bm.free()
 bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.uv.smart_project(angle_limit=math.radians(70),island_margin=.02);bpy.ops.object.mode_set(mode='OBJECT')
 for p in body.data.polygons:p.use_smooth=True
 body.data.update();body.data.set_sharp_from_angle(angle=math.radians(65));body.data.calc_loop_triangles();uv=body.data.uv_layers.active.data;chunks=[]
 for material in [0,1]:
  p=[];n=[];t=[];ix=[];mapping={}
  for tri in body.data.loop_triangles:
   if body.data.polygons[tri.polygon_index].material_index!=material:continue
   for li in tri.loops:
    vi=body.data.loops[li].vertex_index;u=uv[li].uv;corner=body.data.corner_normals[li].vector;key=(vi,round(u.x,7),round(u.y,7),*(round(v,7) for v in corner))
    if key not in mapping:
     mapping[key]=len(p)//3;v=body.data.vertices[vi];co=body.matrix_world@v.co;no=corner.normalized();p.extend([co.x,co.z,-co.y]);n.extend([no.x,no.z,-no.y]);t.extend(u)
    ix.append(mapping[key])
  assert len(p)//3<65536
  chunks.append({'p':packed(p,'f'),'n':packed(n,'f'),'uv':packed(t,'f'),'i':packed(ix,'H')})
 compiled[species]={'parts':chunks,'sockets':sockets};stats[species]={'triangles':len(body.data.loop_triangles),'connectedComponents':components,'nonManifoldEdges':0,'inputSHA256':hashlib.sha256((out/f'{species}-body-input.glb').read_bytes()).hexdigest()}
 bpy.ops.wm.save_as_mainfile(filepath=str(out/f'{species}-editable-anatomy.blend'),compress=True)
ts="// Generated original fish anatomy; edit scripts/art/author-sea-fish-anatomy.py. Lossless Float32/Uint16 storage.\nimport * as THREE from 'three';\nconst data="+json.dumps(compiled,separators=(',',':'))+";\n"
ts+='''type Species=keyof typeof data;
function bytes(s:string){return Uint8Array.from(atob(s),c=>c.charCodeAt(0));}
function floats(s:string){const b=bytes(s),v=new DataView(b.buffer);return Float32Array.from({length:b.length/4},(_,i)=>v.getFloat32(i*4,true));}
const cache=new Map<Species,THREE.BufferGeometry[]>();
export function createAuthoredFishBody(id:Species):THREE.BufferGeometry[]{if(!cache.has(id))cache.set(id,data[id].parts.map(d=>{const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(floats(d.p),3));g.setAttribute('normal',new THREE.BufferAttribute(floats(d.n),3));g.setAttribute('uv',new THREE.BufferAttribute(floats(d.uv),2));const b=bytes(d.i),v=new DataView(b.buffer);g.setIndex(new THREE.BufferAttribute(Uint16Array.from({length:b.length/2},(_,i)=>v.getUint16(i*2,true)),1));return g;}));return cache.get(id)!.map(g=>g.clone());}
export function fishEyeSockets(id:Species):readonly number[][]{return data[id].sockets;}
'''
(root/'src/visual/creatures/v2/sea-authored-fish-geometry.ts').write_text(ts);(out/'fish-anatomy-manifest.json').write_text(json.dumps(stats,indent=2));print('VALIDATED_FISH_ANATOMY',stats)
