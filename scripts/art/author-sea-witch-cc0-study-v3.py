"""Witch-specific derivative of CC0 MakeHuman hm08 core asset (see reference-data).
Original parsing, localized sculpt, eye surface projection and study code; NOT original base topology.
Isolated proof only: no runtime replacement before independent visual review.
"""
import bpy,bmesh,math,json,hashlib,sys
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
ROOT=Path.cwd();OUT=ROOT/'.art/sea-witch-cc0-study-v3';OUT.mkdir(parents=True,exist_ok=True)
SOURCE=ROOT/'scripts/art/reference-data/makehuman-base.obj';BLEND=OUT/'sea-witch-cc0-study.blend'
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
if '--render' not in args:
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
 vertices=[];uv=[];groups={};group=''
 for l in SOURCE.read_text().splitlines():
  p=l.split()
  if not p:continue
  if p[0]=='v':vertices.append(tuple(map(float,p[1:4])))
  elif p[0]=='vt':uv.append(tuple(map(float,p[1:3])))
  elif p[0]=='g':group=p[1]
  elif p[0]=='f':groups.setdefault(group,[]).append([tuple(int(t)-1 if t else -1 for t in a.split('/')) for a in p[1:]])
 # Equal-weight adult female anatomical asset blend; source labels are provenance, not identity.
 original_vertices=list(vertices)
 for source_name in ['african-female-young.target','asian-female-young.target','caucasian-female-young.target']:
  for line in (SOURCE.parent/source_name).read_text().splitlines():
   q=line.split()
   if len(q)!=4 or q[0].startswith('#'):continue
   i=int(q[0]);delta=list(map(float,q[1:]));vertices[i]=tuple(vertices[i][j]+delta[j]/3 for j in range(3))
 eye_ids={p[0] for f in groups['helper-l-eye'] for p in f}
 eye_center=[sum(vertices[i][a] for i in eye_ids)/len(eye_ids) for a in range(3)]
 EX,EY,EZ=eye_center
 def gauss(v,c,w):return math.exp(-((v-c)/w)**2)
 def sculpt(v):
  x,y,z=v;side=1 if x>=0 else -1
  # Local anatomical shapes, never whole-row compression.
  lower=gauss(y,EY-.78,.43)*min(1,max(0,(z+.1)/.8));x*=1-.09*lower
  eye=gauss(abs(x),EX,.235)*gauss(y,EY,.27)*min(1,max(0,(z-.5)/.55))
  y+=side*(x-side*EX)*.09*eye
  # Gentle inner brow focus, lifted outer canthus; retain actual alar/philtrum loops.
  y-=.022*gauss(abs(x),.18,.14)*gauss(y,EY+.15,.12)*max(0,min(1,(z-.7)/.4))
  z+=.018*gauss(abs(x),.47,.17)*gauss(y,EY-.29,.19)
  return x,y,z
 def mapped(v):
  x,y,z=sculpt(v);return (x*.19,(z*.19)-.115,(y-EY)*.205+.035)
 def mat(name,c,rough=.55):
  m=bpy.data.materials.new(name);m.use_nodes=True;n=m.node_tree.nodes['Principled BSDF'];n.inputs['Base Color'].default_value=(*c,1);n.inputs['Roughness'].default_value=rough;return m
 skin=mat('witch-cool-skin',(.29,.48,.49));white=mat('witch-muted-sclera',(.40,.58,.56),.34);iris=mat('witch-teal-iris',(.025,.24,.27),.3);pupil=mat('witch-dark-pupil',(.003,.018,.025),.3)
 def part(name,faces,material):
  faces=[list(reversed(f)) for f in faces]
  used=sorted({p[0] for f in faces for p in f});remap={v:i for i,v in enumerate(used)}
  mesh=bpy.data.meshes.new(name);mesh.from_pydata([mapped(vertices[i]) for i in used],[],[[remap[p[0]] for p in f] for f in faces]);mesh.update();o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);mesh.materials.append(material)
  layer=mesh.uv_layers.new(name='CC0-original-UV')
  for poly,face in zip(mesh.polygons,faces):
   poly.use_smooth=True
   for li,p in zip(poly.loop_indices,face):layer.data[li].uv=uv[p[1]] if len(p)>1 and p[1]>=0 else (0,0)
  return o,used
 faces=[f for f in groups['body'] if min(original_vertices[p[0]][1] for p in f)>=6]
 head,used=part('aquatic-cc0-skin',faces,skin)
 # Decimate concealed scalp most, while anatomically weighted face remains influential.
 group=head.vertex_groups.new(name='face-retention')
 for i,original in enumerate(used):
  p=head.data.vertices[i].co;critical=p.y>.07 and ((abs(abs(p.x)-.054)<.037 and abs(p.z-.035)<.029) or (abs(p.x)<.035 and -.067<p.z<.04) or (abs(p.x)<.055 and -.135<p.z<-.067));group.add([i],1. if critical else .05,'REPLACE')
 mod=head.modifiers.new('budgeted-anatomical-retopology','DECIMATE');mod.ratio=.45;mod.vertex_group=group.name;mod.vertex_group_factor=1000.;mod.invert_vertex_group=True;mod.use_collapse_triangulate=True
 bpy.context.view_layer.objects.active=head;bpy.ops.object.modifier_apply(modifier=mod.name)
 # Close only the neck cut: the actual eye/mouth apertures remain anatomically open.
 bm=bmesh.new();bm.from_mesh(head.data);edges=[e for e in bm.edges if e.is_boundary and max(v.co.z for v in e.verts)<-.12]
 # Level the cut below garment attachment, rather than capping an uneven sawtooth rim.
 for v in {v for e in edges for v in e.verts}:v.co.z=-.24
 if edges:bmesh.ops.holes_fill(bm,edges=edges,sides=0)
 bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(head.data);bm.free();head.data.update()
 for polygon in head.data.polygons:polygon.use_smooth=True
 for side,label in [(-1,'r'),(1,'l')]:
  eye,_=part('aquatic-cc0-sclera-'+label,groups['helper-'+label+'-eye'],white)
  bvh=BVHTree.FromPolygons([v.co for v in eye.data.vertices],[list(p.vertices) for p in eye.data.polygons])
  center=sum((v.co for v in eye.data.vertices),Vector())/len(eye.data.vertices)
  targets=[bvh]
  globe_rx=(max(v.co.x for v in eye.data.vertices)-min(v.co.x for v in eye.data.vertices))/2
  for name,r,material,eps in [('iris',globe_rx*.48,iris,.00035),('pupil',globe_rx*.21,pupil,.00065)]:
   vs=[];faces=[];segments=20;rings=2
   for j in range(rings+1):
    count=1 if j==0 else segments
    for i in range(count):
     a=i/segments*math.tau;x=center.x+r*j/rings*math.cos(a);z=center.z+r*j/rings*math.sin(a)
     hit,normal,_,_=bvh.ray_cast(Vector((x,1,z)),Vector((0,-1,0)))
     if hit is None:raise RuntimeError('iris actual globe ray miss')
     vs.append(tuple(hit+normal*eps))
   for i in range(segments):faces.append((0,1+i,1+(i+1)%segments))
   for i in range(segments):faces.append((1+i,1+segments+i,1+segments+(i+1)%segments,1+(i+1)%segments))
   # Probe face interiors too: ray-seated vertices alone can intersect helper facets.
   lift=0.
   for f in faces:
    for ids in [(f[0],f[j],f[j+1]) for j in range(1,len(f)-1)]:
     for w in [(1/3,1/3,1/3),(.6,.2,.2),(.2,.6,.2),(.2,.2,.6),(.5,.5,0),(0,.5,.5),(.5,0,.5)]:
      point=sum((Vector(vs[i])*weight for i,weight in zip(ids,w)),Vector())
      for target in targets:
       hit,_,_,_=target.ray_cast(Vector((point.x,1,point.z)),Vector((0,-1,0)))
       if hit is not None:lift=max(lift,hit.y+.0004-point.y)
   vs=[(x,y+lift,z) for x,y,z in vs]
   mesh=bpy.data.meshes.new(name);mesh.from_pydata(vs,[],[tuple(reversed(f)) for f in faces]);mesh.update();o=bpy.data.objects.new('aquatic-cc0-'+name+'-'+label,mesh);bpy.context.collection.objects.link(o);mesh.materials.append(material)
   targets.append(BVHTree.FromPolygons([v.co for v in mesh.vertices],[list(p.vertices) for p in mesh.polygons]));print('ACTUAL_EYE_INTERIOR_CLEARANCE_LIFT',label,name,lift)

   for p in mesh.polygons:p.use_smooth=True
 # Exact triangle count before any review; keep anatomical study separate from game factory.
 counts={o.name:sum(len(p.vertices)-2 for p in o.data.polygons) for o in bpy.context.scene.objects if o.type=='MESH'}
 print('STUDY_TRIANGLES',counts,sum(counts.values()))
 bpy.ops.export_scene.gltf(filepath=str(OUT/'sea-witch-cc0-study.glb'),export_format='GLB')
 scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=40;scene.cycles.use_denoising=False;scene.render.resolution_x=scene.render.resolution_y=1024;scene.render.resolution_percentage=100;scene.view_settings.view_transform='AgX';scene.world.color=(.14,.16,.19)
 target=Vector((0,.03,.02));bpy.ops.object.camera_add();camera=bpy.context.object;scene.camera=camera;camera.data.type='ORTHO';camera.data.ortho_scale=.57
 for loc,power,size,color in [((-2,3,3),350,3,(1,.93,.87)),((2,1,1),160,2,(.8,.9,1)),((0,-2,2),250,2,(.8,.9,1))]:
  bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.data.energy=power;o.data.size=size;o.data.color=color;o.rotation_euler=(target-o.location).to_track_quat('-Z','Y').to_euler()
 bpy.ops.wm.save_as_mainfile(filepath=str(BLEND),compress=True)
 (OUT/'manifest.json').write_text(json.dumps({'sourceGitBlob':'d26635e9326e3cca30778fd7b9c00062b03cce09','sourceSha256':sha(SOURCE),'adultMorphWeights':{'african-female-young':1/3,'asian-female-young':1/3,'caucasian-female-young':1/3},'scriptSha256':sha(Path(__file__)),'blendSha256':sha(BLEND),'glbSha256':sha(OUT/'sea-witch-cc0-study.glb'),'triangles':counts,'purpose':'private CC0-derived witch anatomy study; not runtime or appearance approved'},indent=2));sys.exit(0)
m=json.loads((OUT/'manifest.json').read_text());assert sha(BLEND)==m['blendSha256'];bpy.ops.wm.open_mainfile(filepath=str(BLEND));scene=bpy.context.scene;camera=scene.camera;target=Vector((0,.03,.02))
for name,d in [('front',(0,1,0)),('three-quarter',(.64,.77,0)),('profile',(1,0,0))]:
 camera.location=target+Vector(d)*3;camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=str(OUT/(name+'.png'));bpy.ops.render.render(write_still=True)
