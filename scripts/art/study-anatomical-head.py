"""Head-only CC0 MakeHuman anatomy study. Not a production model or approval.
All parsing/transforms/review code here is authored for this repository; no external program logic.
"""
import bpy,bmesh,json,hashlib,sys,math
from pathlib import Path
from mathutils import Vector
ROOT=Path.cwd();OUT=ROOT/'.art/anatomical-head-study';OUT.mkdir(parents=True,exist_ok=True)
SOURCE=ROOT/'scripts/art/reference-data/makehuman-base.obj'
blend=OUT/'anatomical-head-study.blend'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
args=sys.argv[sys.argv.index('--')+1:]if '--'in sys.argv else []
if '--render'not in args:
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
 vertices=[];uv=[];groups={};group=''
 for line in SOURCE.read_text().splitlines():
  parts=line.split()
  if not parts:continue
  if parts[0]=='v':vertices.append(tuple(map(float,parts[1:4])))
  elif parts[0]=='vt':uv.append(tuple(map(float,parts[1:3])))
  elif parts[0]=='g':group=parts[1]
  elif parts[0]=='f':groups.setdefault(group,[]).append([tuple(int(t)-1 if t else -1 for t in item.split('/'))for item in parts[1:]])
 def material(name,color,roughness=.55):
  m=bpy.data.materials.new(name);m.use_nodes=True;n=m.node_tree.nodes['Principled BSDF'];n.inputs['Base Color'].default_value=(*color,1);n.inputs['Roughness'].default_value=roughness;return m
 skin=material('neutral-anatomy-skin',(.52,.39,.34));white=material('neutral-eye-sclera',(.65,.62,.57),.32)
 iris=material('study-dark-red-iris',(.13,.012,.018),.35);pupil=material('study-black-pupil',(.004,.003,.004),.3)
 def mapped(v):x,y,z=v;return(x*.32,-z*.32,(y-6)*.32)
 def part(name,faces,mat):
  used=sorted(set(p[0]for f in faces for p in f));remap={v:i for i,v in enumerate(used)}
  mesh=bpy.data.meshes.new(name);mesh.from_pydata([mapped(vertices[i])for i in used],[],[[remap[p[0]]for p in f]for f in faces]);mesh.update()
  obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj);mesh.materials.append(mat)
  layer=mesh.uv_layers.new(name='original-CC0-UV')
  for poly,face in zip(mesh.polygons,faces):
   poly.use_smooth=True
   for li,p in zip(poly.loop_indices,face):layer.data[li].uv=uv[p[1]]if len(p)>1 and p[1]>=0 else(0,0)
  return obj
 faces=[f for f in groups['body']if min(vertices[p[0]][1]for p in f)>=6]
 head=part('CC0-anatomical-head-neck-study',faces,skin)
 # Preserve the original helper eyeball geometry and anatomical seating, not new guessed spheres.
 for side,label in [(-1,'r'),(1,'l')]:
  part('study-eye-'+label,groups['helper-'+label+'-eye'],white)
  for name,r,z,mat in [('iris',.055,1.386,iris),('pupil',.023,1.394,pupil)]:
   center=Vector(mapped((side*.30775,7.28415,z)));verts=[center];rings=3;segs=24
   for j in range(1,rings+1):
    radius=r*j/rings
    for i in range(segs):
     a=i/segs*math.tau;dx=radius*math.cos(a);dy=radius*math.sin(a)
     zz=1.24535+math.sqrt(max(.001,.1466**2-dx**2-dy**2))+(z-1.386)
     verts.append(Vector(mapped((side*.30775+dx,7.28415+dy,zz))))
   fs=[]
   for i in range(segs):fs.append((0,1+i,1+(i+1)%segs))
   for j in range(rings-1):
    a=1+j*segs;b=a+segs
    for i in range(segs):fs.append((a+i,b+i,b+(i+1)%segs,a+(i+1)%segs))
   m=bpy.data.meshes.new(name);m.from_pydata(verts,[],fs);m.update();o=bpy.data.objects.new(name+label,m);bpy.context.collection.objects.link(o);m.materials.append(mat)
   for p in m.polygons:p.use_smooth=True
 bpy.ops.export_scene.gltf(filepath=str(OUT/'anatomical-head-study.glb'),export_format='GLB')
 scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=32;scene.cycles.use_denoising=False
 scene.render.resolution_x=1024;scene.render.resolution_y=1024;scene.render.resolution_percentage=100
 scene.world.color=(.16,.18,.22);scene.view_settings.view_transform='AgX'
 target=Vector((0,-.16,.43))
 bpy.ops.object.camera_add();camera=bpy.context.object;camera.name='study-camera';scene.camera=camera;camera.data.type='ORTHO';camera.data.ortho_scale=.95
 for loc,power,size,color in [((-2,-3,3),500,3,(1,.88,.79)),((2,-1,1),180,2,(.72,.83,1)),((0,2,2),400,2,(.8,.86,1))]:
  bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.data.energy=power;o.data.shape='DISK';o.data.size=size;o.data.color=color;o.rotation_euler=(target-o.location).to_track_quat('-Z','Y').to_euler()
 bpy.ops.wm.save_as_mainfile(filepath=str(blend),compress=True)
 (OUT/'manifest.json').write_text(json.dumps({'sourceSha256':sha(SOURCE),'sourceGitBlob':'d26635e9326e3cca30778fd7b9c00062b03cce09','blendSha256':sha(blend),'glbSha256':sha(OUT/'anatomical-head-study.glb'),'purpose':'isolated CC0 anatomy study; neck cut open; not production; no model approval'},indent=2));print('SAVED_HEAD_STUDY_BEFORE_PREVIEW');sys.exit(0)
manifest=json.loads((OUT/'manifest.json').read_text());assert sha(blend)==manifest['blendSha256'];bpy.ops.wm.open_mainfile(filepath=str(blend));scene=bpy.context.scene;camera=scene.camera;target=Vector((0,-.16,.43))
for name,direction in [('front',(0,-1,0)),('three-quarter',(.64,-.77,0)),('profile',(1,0,0))]:
 camera.location=target+Vector(direction)*3;camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=str(OUT/(name+'.png'));bpy.ops.render.render(write_still=True)
