"""Original humanoid skull anatomy: real orbital/nasal/oral cavities, UVs, two LODs.
Bird uses its separate avian construction. No image pixels or third-party meshes copied.
"""
import bpy,bmesh,math,json,pathlib
from mathutils import Vector
root=pathlib.Path.cwd();out=root/'.art/skull-authored';out.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
source=bpy.data.collections.new('EDITABLE_SKULL_SOURCE');bpy.context.scene.collection.children.link(source)
bone=bpy.data.materials.new('Aged ivory bone');bone.diffuse_color=(.68,.60,.44,1)
cavity=bpy.data.materials.new('Recessed warm bone cavity');cavity.diffuse_color=(.12,.09,.07,1)
# Authored cranial/zygomatic/maxillary/jaw profile, Three coordinates before conversion.
profile=[(-.245,.105,.085,.03),(-.22,.13,.11,.045),(-.18,.14,.115,.06),(-.12,.145,.13,.09),(-.065,.175,.15,.13),(-.025,.205,.16,.16),(.07,.205,.17,.17),(.13,.16,.135,.14),(.18,.10,.08,.09),(.205,.012,.015,.015)]
def interpolate(t):
 p=t*(len(profile)-1);i=min(len(profile)-2,int(p));f=p-i
 a=profile[max(0,i-1)];b=profile[i];c=profile[i+1];d=profile[min(len(profile)-1,i+2)]
 values=[.5*(2*b[j]+(-a[j]+c[j])*f+(2*a[j]-5*b[j]+4*c[j]-d[j])*f*f+(-a[j]+3*b[j]-3*c[j]+d[j])*f*f*f) for j in range(4)]
 return [values[0],max(.003,values[1]),max(.005,values[2]),max(.005,values[3])]
verts=[];faces=[];rings=48;sides=48
for row in range(rings+1):
 y,rx,front,back=interpolate(row/rings)
 for col in range(sides):
  a=col/sides*math.tau;x=rx*math.sin(a);c=math.cos(a);z=(back if c>=0 else front)*c
  if c<0:
   brow=.035*math.exp(-((abs(x)-.10)**2/.003+(y-.10)**2/.002))
   nose=.025*math.exp(-(x*x/.001+(y-.025)**2/.01))
   cheek=.034*math.exp(-((abs(x)-.15)**2/.0018+(y+.035)**2/.003))
   z-=(brow+nose+cheek)*(-c)
  verts.append((x,-z,y))
  if row<rings:faces.append((row*sides+col,row*sides+(col+1)%sides,(row+1)*sides+(col+1)%sides,(row+1)*sides+col))
for row,reverse in [(0,True),(rings,False)]:
 c=Vector();ids=[row*sides+i for i in range(sides)]
 for i in ids:c+=Vector(verts[i])
 c/=sides;center=len(verts);verts.append(tuple(c))
 for col in range(sides):faces.append((center,ids[(col+1)%sides],ids[col]) if reverse else (center,ids[col],ids[(col+1)%sides]))
mesh=bpy.data.meshes.new('Authored cranial planes');mesh.from_pydata(verts,[],faces);mesh.update()
body=bpy.data.objects.new('Sculpted_Humanoid_Skull',mesh);bpy.context.collection.objects.link(body);bpy.context.view_layer.objects.active=body;body.select_set(True)
body.data.materials.append(bone);body.data.materials.append(cavity)
bm=bmesh.new();bm.from_mesh(body.data);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(body.data);bm.free()
base=body.copy();base.data=body.data.copy();source.objects.link(base);base.name='Editable_Cranium_Before_Cavities';base.hide_render=True;base.hide_set(True)
def cut(name,loc,scale,tilt=0,nose=False,orbit=0):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=16,location=loc);obj=bpy.context.object;obj.name=name;obj.scale=scale;obj.rotation_euler[1]=tilt
 if nose:
  for v in obj.data.vertices:v.co.x*=1-.25*v.co.z
 if orbit:
  for v in obj.data.vertices:
   if v.co.z>0:v.co.z=v.co.z*(.70+.30*(orbit*v.co.x+1)/2)+.16*orbit*v.co.x

 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 obj.data.materials.append(bone);obj.data.materials.append(cavity)
 for p in obj.data.polygons:p.material_index=1
 mod=body.modifiers.new(name,'BOOLEAN');mod.operation='DIFFERENCE';mod.solver='EXACT';mod.object=obj;mod.material_mode='INDEX'
 bpy.context.view_layer.objects.active=body;bpy.ops.object.modifier_apply(modifier=mod.name)
 for coll in list(obj.users_collection):coll.objects.unlink(obj)
 source.objects.link(obj);obj.hide_render=True;obj.hide_set(True)
def polygon_cut(name,outline,front=.26,back=.075):
 cx=sum(p[0] for p in outline)/len(outline);cy=sum(p[1] for p in outline)/len(outline);count=len(outline)
 points=[(x,front,y) for x,y in outline]+[(cx+(x-cx)*.72,back,cy+(y-cy)*.72) for x,y in outline]
 fs=[tuple(range(count-1,-1,-1)),tuple(range(count,2*count))]+[(i,(i+1)%count,(i+1)%count+count,i+count) for i in range(count)]
 me=bpy.data.meshes.new(name);me.from_pydata(points,[],fs);me.update();ob=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(ob);bpy.context.view_layer.objects.active=ob
 ob.data.materials.append(bone);ob.data.materials.append(cavity)
 for p in ob.data.polygons:p.material_index=1
 bm=bmesh.new();bm.from_mesh(ob.data);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(ob.data);bm.free()
 bevel=ob.modifiers.new('Anatomical soft rim','BEVEL');bevel.width=.009;bevel.segments=3;bpy.ops.object.modifier_apply(modifier=bevel.name)
 mod=body.modifiers.new(name,'BOOLEAN');mod.operation='DIFFERENCE';mod.solver='EXACT';mod.object=ob;mod.material_mode='INDEX';bpy.context.view_layer.objects.active=body;bpy.ops.object.modifier_apply(modifier=mod.name)
 for coll in list(ob.users_collection):coll.objects.unlink(ob)
 source.objects.link(ob);ob.hide_render=True;ob.hide_set(True)
for side in [-1,1]:
 polygon_cut('Sculpted_angular_orbit',[(side*.035,.058),(side*.143,.103),(side*.169,.035),(side*.132,-.043),(side*.057,-.025),(side*.027,.012)])
 cut('Hollow_beneath_zygomatic_arch',(side*.16,.135,-.116),(.035,.065,.028))
nose_mesh=bpy.data.meshes.new('Rounded triangular nasal aperture')
nose_mesh.from_pydata([(0,.25,.008),(-.034,.25,-.106),(.034,.25,-.106),(0,.07,.008),(-.028,.07,-.100),(.028,.07,-.100)],[],[(0,2,1),(3,4,5),(0,1,4,3),(1,2,5,4),(2,0,3,5)]);nose_mesh.update()
nose=bpy.data.objects.new('True_triangular_nasal_cavity',nose_mesh);bpy.context.collection.objects.link(nose);bpy.context.view_layer.objects.active=nose
nose.data.materials.append(bone);nose.data.materials.append(cavity)
for p in nose.data.polygons:p.material_index=1
bm=bmesh.new();bm.from_mesh(nose.data);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(nose.data);bm.free()
bevel=nose.modifiers.new('Soft nasal rim','BEVEL');bevel.width=.005;bevel.segments=2;bpy.ops.object.modifier_apply(modifier=bevel.name)
mod=body.modifiers.new('Actual nasal void','BOOLEAN');mod.operation='DIFFERENCE';mod.solver='EXACT';mod.object=nose;mod.material_mode='INDEX';bpy.context.view_layer.objects.active=body;bpy.ops.object.modifier_apply(modifier=mod.name)
for coll in list(nose.users_collection):coll.objects.unlink(nose)
source.objects.link(nose);nose.hide_render=True;nose.hide_set(True)
polygon_cut('Articulated_stern_mouth',[(-.114,-.169),(-.086,-.139),(.086,-.139),(.114,-.169),(.102,-.198),(-.102,-.198)],.24,.065)
# Five rooted upper teeth; tapered forms, not a painted mouth stripe.
for i in range(5):
 x=(i-2)*.034
 bpy.ops.mesh.primitive_cube_add(size=1,location=(x,.135,-.145));tooth=bpy.context.object;tooth.name='Rooted_upper_tooth';tooth.scale=([.024,.026,.028,.026,.024][i],.024,[.043,.052,.049,.051,.044][i])
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 bevel=tooth.modifiers.new('Small tooth edge','BEVEL');bevel.width=.004;bevel.segments=1;bpy.ops.object.modifier_apply(modifier=bevel.name)
 tooth.data.materials.append(bone)
 mod=body.modifiers.new('Rooted tooth union','BOOLEAN');mod.operation='UNION';mod.solver='EXACT';mod.object=tooth
 bpy.context.view_layer.objects.active=body;bpy.ops.object.modifier_apply(modifier=mod.name);bpy.data.objects.remove(tooth,do_unlink=True)
for p in body.data.polygons:p.use_smooth=True
body.data.update()
source_body=body.copy();source_body.data=body.data.copy();source.objects.link(source_body);source_body.name='Editable_Cavity_Sculpt_High';source_body.hide_render=True;source_body.hide_set(True)
outputs={};stats={}
for name,target in [('mob',1000),('boss',2200)]:
 obj=body.copy();obj.data=body.data.copy();bpy.context.collection.objects.link(obj);obj.name='Runtime_Skull_'+name;bpy.context.view_layer.objects.active=obj
 bpy.ops.object.select_all(action='DESELECT');obj.hide_set(False);obj.select_set(True)
 obj.data.calc_loop_triangles();before=len(obj.data.loop_triangles)
 dec=obj.modifiers.new('Budget preserving cavities','DECIMATE');dec.ratio=min(1,target/before);dec.use_collapse_triangulate=True;dec.delimit={'MATERIAL'};bpy.ops.object.modifier_apply(modifier=dec.name)
 bm=bmesh.new();bm.from_mesh(obj.data);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);nonman=sum(not e.is_manifold for e in bm.edges);assert nonman==0,(name,nonman);bm.to_mesh(obj.data);bm.free()
 bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.uv.smart_project(angle_limit=math.radians(66),island_margin=.025);bpy.ops.object.mode_set(mode='OBJECT')
 for p in obj.data.polygons:p.use_smooth=True
 obj.data.update();obj.data.calc_loop_triangles();uv=obj.data.uv_layers.active.data;chunks=[]
 for material in [0,1]:
  pos=[];normal=[];tex=[];indices=[];mapping={}
  for tri in obj.data.loop_triangles:
   if obj.data.polygons[tri.polygon_index].material_index!=material:continue
   for li in tri.loops:
    vi=obj.data.loops[li].vertex_index;u=uv[li].uv;key=(vi,round(u.x,7),round(u.y,7))
    if key not in mapping:
     mapping[key]=len(pos)//3;v=obj.data.vertices[vi];p=v.co;n=v.normal.normalized();pos.extend([p.x,p.z,-p.y]);normal.extend([n.x,n.z,-n.y]);tex.extend(u)
    indices.append(mapping[key])
  assert all(math.isfinite(v) for v in pos+normal+tex)
  chunks.append({'p':pos,'n':normal,'uv':tex,'i':indices})
 outputs[name]=chunks;stats[name]={'triangles':len(obj.data.loop_triangles),'vertices':len(obj.data.vertices),'nonManifoldEdges':nonman,'cavityTriangles':len(chunks[1]['i'])//3}
 obj.hide_render=name!='boss';obj.hide_set(name!='boss')
bpy.data.objects.remove(body,do_unlink=True)
# Compact generator-owned module; seam-split UV vertices preserve smooth normals.
def rounded(x):
 if isinstance(x,float):return round(x,7)
 if isinstance(x,list):return [rounded(v) for v in x]
 if isinstance(x,dict):return {k:rounded(v) for k,v in x.items()}
 return x
import sys
sys.path.insert(0,str(root/'scripts/art'))
from indexed_geometry_storage import pack_records
text="// Generated original indexed anatomy; exact Float32/Uint16 storage.\nimport { createPackedIndexedAnatomy } from './sea-skull-packed-geometry';\nconst data="+json.dumps(pack_records(rounded(outputs)),separators=(',',':'))+";\nexport function createAuthoredSkullGeometry(lod:'mob'|'boss'){return data[lod].map(createPackedIndexedAnatomy);}\n"
(root/'src/visual/creatures/v2/skull-authored-geometry.ts').write_text(text)
(out/'skull-anatomy-manifest.json').write_text(json.dumps(stats,indent=2));bpy.ops.wm.save_as_mainfile(filepath=str(out/'skull-editable-authoring.blend'));print('VALIDATED_AUTHORED_SKULLS',stats)
