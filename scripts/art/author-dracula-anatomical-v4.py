"""Dracula V4: stylized CC0 MakeHuman hm08 head-only anatomical foundation.
Original graphical asset is CC0; no MakeHuman application code is included.
All selection, stylization, eyelid/iris fitting and runtime compilation authored here.
"""
import bpy,bmesh,math,json,hashlib,runpy
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
ROOT=Path.cwd();OUT=ROOT/'.art/creature-v2/castle-anatomical-v4-authoring';OUT.mkdir(parents=True,exist_ok=True)
SOURCE=ROOT/'scripts/art/reference-data/makehuman-base.obj'
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
vertices=[];uvs=[];groups={};group=''
for line in SOURCE.read_text().splitlines():
 p=line.split()
 if not p:continue
 if p[0]=='v':vertices.append(tuple(map(float,p[1:4])))
 elif p[0]=='vt':uvs.append(tuple(map(float,p[1:3])))
 elif p[0]=='g':group=p[1]
 elif p[0]=='f':groups.setdefault(group,[]).append([tuple(int(t)-1 if t else -1 for t in item.split('/'))for item in p[1:]])
# Equal-weight official adult-male graphical targets; names are provenance,
# not an inferred ethnicity for the fictional character. Apply to every vertex,
# including helper eyes, before deriving centers and coordinate mapping.
morph_files=['african-male-young.target','asian-male-young.target','caucasian-male-young.target']
vertices=[list(v)for v in vertices]
for filename in morph_files:
 for line in (SOURCE.parent/filename).read_text().splitlines():
  p=line.split()
  if not p or p[0].startswith('#'):continue
  vi=int(p[0]);delta=list(map(float,p[1:4]))
  for axis in range(3):vertices[vi][axis]+=delta[axis]/3
centers={};radii={}
for label in ['r','l']:
 used={p[0]for f in groups['helper-'+label+'-eye']for p in f}
 lo=[min(vertices[i][axis]for i in used)for axis in range(3)];hi=[max(vertices[i][axis]for i in used)for axis in range(3)]
 centers[label]=[(a+b)/2 for a,b in zip(lo,hi)];radii[label]=[(b-a)/2 for a,b in zip(lo,hi)]
EYE_Y=sum(c[1]for c in centers.values())/2
ANCHOR_SHIFT=EYE_Y-7.28415
def mapped(v,skin=False):
 x,y,z=v;yy=2.96+(y-EYE_Y)*(.265 if y<EYE_Y else .175)
 xx=x*.20;zz=-(z-.65)*.17
 if skin:
  # Lean adult mandibular taper; anatomical cheek/nose/lip loops remain intact.
  jaw=math.exp(-((y-(6.45+ANCHOR_SHIFT))/.45)**2);xx*=1-.055*jaw
  nasal=math.exp(-((x/.20)**2)-((y-(6.94+ANCHOR_SHIFT))/.30)**2)*max(0,min(1,(z-1.25)/.25))
  xx*=1-.14*nasal;zz-=.007*nasal
  brow=math.exp(-((abs(x)-.30)/.20)**2-((y-(7.36+ANCHOR_SHIFT))/.10)**2)*max(0,min(1,(z-1.2)/.25))
  zz-=.005*brow;yy-=.003*brow
  # Upper helix becomes a restrained pointed ear, retaining concha/antihelix.
  ear=max(0,min(1,(abs(x)-.70)/.16))*math.exp(-((y-(7.36+ANCHOR_SHIFT))/.20)**2)*max(0,min(1,(.80-z)/.35))
  xx+=math.copysign(.018*ear,x);yy+=.045*ear
 return (xx,yy,zz)
def material(name,color):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);return m
def mesh(name,v,f,color=(.5,.43,.39)):
 m=bpy.data.meshes.new(name);m.from_pydata(v,[],f);m.update();o=bpy.data.objects.new(name,m);bpy.context.collection.objects.link(o);m.materials.append(material(name+'-source-material',color))
 for p in m.polygons:p.use_smooth=True
 return o
def imported(name,faces,is_skin=False):
 used=sorted({p[0]for f in faces for p in f});remap={vi:i for i,vi in enumerate(used)}
 o=mesh(name,[mapped(vertices[i],is_skin)for i in used],[[remap[p[0]]for p in f]for f in faces]);layer=o.data.uv_layers.new(name='CC0-original-UV')
 for poly,face in zip(o.data.polygons,faces):
  for li,p in zip(poly.loop_indices,face):layer.data[li].uv=uvs[p[1]]if len(p)>1 and p[1]>=0 else(0,0)
 if not is_skin:
  bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free();o.data.update()
 return o
faces=[f for f in groups['body']if min(vertices[p[0]][1]for p in f)>=6+ANCHOR_SHIFT]
skin=imported('authored-vampire-face',faces,True)
# Close the cropped neck under the high collar; no ragged open source-cut edge.
bm=bmesh.new();bm.from_mesh(skin.data)
neck_edges=[e for e in bm.edges if e.is_boundary and max(v.co.y for v in e.verts)<2.68]
neck_verts={v for e in neck_edges for v in e.verts}
assert neck_edges,'Expected cropped neck boundary'
for v in neck_verts:v.co.y=2.54
bmesh.ops.holes_fill(bm,edges=neck_edges,sides=0);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(skin.data);bm.free()
# Reduce exact runtime topology once, never add offline-only subdivision.
bpy.context.view_layer.objects.active=skin;skin.select_set(True)
md=skin.modifiers.new('Runtime anatomical surface budget','DECIMATE');md.ratio=.50;md.use_collapse_triangulate=True;bpy.ops.object.modifier_apply(modifier=md.name);skin.select_set(False)
# Preserve the anatomical loop structure; a small expressive upper-lid lift
# keeps the iris readable while the medial orbital roof remains focused.
for v in skin.data.vertices:
 x,y,z=v.co;cx=math.copysign(abs(centers['l'][0])*.20,x);dx=x-cx
 if z<-.07 and abs(dx)<.034 and 2.96<y<2.994:
  support=max(0,1-(dx/.034)**2)*math.sin(math.pi*(y-2.96)/.034)
  v.co.y+=.003*support
 if z<-.07:
  roof=math.exp(-((abs(x)-.039)/.026)**2-((y-2.985)/.016)**2)
  v.co.z-=.004*roof
skin.data.update()
for p in skin.data.polygons:p.use_smooth=True
col=skin.data.color_attributes.new(name='COLOR_0',type='FLOAT_COLOR',domain='POINT')
for v in skin.data.vertices:
 x,y,z=v.co;orbit=math.exp(-((abs(x)-.0615)/.045)**2-((y-2.965)/.032)**2)if z<-.07 else 0
 cheek=math.exp(-((abs(x)-.103)/.028)**2-((y-2.86)/.055)**2)
 col.data[v.index].color=(.94-.17*orbit-.045*cheek,.88-.20*orbit-.05*cheek,.86-.16*orbit-.025*cheek,1)
skin.data.update();skin_bvh=BVHTree.FromObject(skin,bpy.context.evaluated_depsgraph_get())
def front(x,y,offset=0):
 hit=skin_bvh.ray_cast(Vector((x,y,-3)),Vector((0,0,1)))
 assert hit[0] is not None,('Skin projection miss',x,y)
 return hit[0].z-offset
for side,label in [(-1,'r'),(1,'l')]:
 eye=imported('anatomical-almond-sclera-'+label,groups['helper-'+label+'-eye'])
 eye_bvh=BVHTree.FromObject(eye,bpy.context.evaluated_depsgraph_get())
 eye_center=sum((v.co for v in eye.data.vertices),Vector())/len(eye.data.vertices)
 assert all(p.normal.dot(p.center-eye_center)>0 for p in eye.data.polygons),'Inward eyeball winding after reflected coordinate mapping'
 # Measure the visible aperture against the actual adapted skin/globe pair.
 # Helper center is anatomical, not necessarily the visible pupil target.
 eye_x=(min(v.co.x for v in eye.data.vertices)+max(v.co.x for v in eye.data.vertices))/2
 visible=[]
 for ix in range(-33,34):
  for iy in range(66):
   x=eye_x+ix*.001;y=2.925+iy*.001;origin=Vector((x,y,-3));direction=Vector((0,0,1))
   eh=eye_bvh.ray_cast(origin,direction);sh=skin_bvh.ray_cast(origin,direction)
   if eh[0] is not None and (sh[0] is None or eh[0].z<sh[0].z-.00001):visible.append((x,y))
 assert len(visible)>100,'Visible anatomical eye aperture is unexpectedly closed'
 gaze_y=(min(p[1]for p in visible)+max(p[1]for p in visible))/2
 for name,radius,rings,offset in [('ruby-eye',.013,2,.0005),('pupil',.0052,2,.0015)]:
  vv=[];ff=[];segs=20
  coords=[(0,0)]+[(radius*j/rings*math.cos(i*math.tau/segs),radius*j/rings*math.sin(i*math.tau/segs))for j in range(1,rings+1)for i in range(segs)]
  for dx,dy in coords:
   x=eye_x+dx;y=gaze_y+dy;hit=eye_bvh.ray_cast(Vector((x,y,-3)),Vector((0,0,1)))
   assert hit[0] is not None,('Iris projection misses actual eye',name,dx,dy)
   vv.append((x,y,hit[0].z-offset))
  for i in range(segs):ff.append((0,1+(i+1)%segs,1+i))
  for j in range(rings-1):
   a=1+j*segs;b=a+segs
   for i in range(segs):ff.append((a+i,a+(i+1)%segs,b+(i+1)%segs,b+i))
  mesh(name+'-'+label,vv,ff,(.08,.01,.02)if name=='ruby-eye'else(.005,.004,.006))
 # Thick tapered brow seated on actual frontal bone, low medial / raised lateral.
 vv=[];ff=[];steps=20
 for i in range(steps+1):
  t=i/steps;x=side*(.025+.084*t);y=2.972+(.020*t/.65 if t<.65 else .020-.006*(t-.65)/.35);half=.001+.0045*math.sin(math.pi*t)**.7
  for band in [-1,0,1]:
   yy=y+band*half;vv.append((x,yy,front(x,yy,.0010+(.0022 if band==0 else 0))))
  if i<steps:
   a=i*3
   for k in range(2):ff.append((a+k,a+3+k,a+4+k,a+1+k))
 brow=mesh('sculpted-natural-brow-'+label,vv,ff,(.02,.015,.022))
 for p in brow.data.polygons:
  if p.normal.z>0:p.flip()
# Low-volume scalp-supported swept coif; actual anatomical cranium governs shape.
v=[];f=[];ns=36;nr=12;center_z=.025;scalp_top=max(v.co.y for v in skin.data.vertices);top=scalp_top+.018
for j in range(nr+1):
 t=j/nr
 for i in range(ns+1):
  a=math.tau*i/ns;frontward=max(0,-math.cos(a));rear=max(0,math.cos(a));d=Vector((math.sin(a),0,math.cos(a)))
  edge=3.03+.04*frontward-.14*rear-.028*frontward*math.exp(-(math.sin(a)/.25)**2)
  y=edge*(1-t)+top*t;query_y=min(y,scalp_top-.015)
  section=[v.co.z for v in skin.data.vertices if abs(v.co.y-query_y)<.018]
  assert section
  section_z=(min(section)+max(section))/2
  hit=skin_bvh.ray_cast(Vector((d.x*2,query_y,section_z+d.z*2)),-d)
  assert hit[0] is not None,('Hair scalp miss',y,a)
  r=math.hypot(hit[0].x,hit[0].z-section_z)+.009 if hit[0]else.035
  if y>scalp_top-.015:r*=math.sqrt(max(0,(top-y)/.033))
  flow=a+1.15*t*math.sin(a)
  crest=0
  for center in [math.pi-.9,math.pi-.3,math.pi+.3,math.pi+.9]:
   distance=abs(math.atan2(math.sin(flow-center),math.cos(flow-center)))
   crest+=max(0,1-distance/.38)
  r+=(.003+.009*math.sin(math.pi*t))*crest*max(0,1-t)**.25
  v.append((d.x*r,y,section_z+d.z*r))
  if j<nr and i<ns:n=j*(ns+1)+i;f.append((n,n+1,n+ns+2,n+ns+1))
center=len(v);v.append((0,2.94,center_z))
for i in range(ns):f.append((center,i+1,i))
hair=mesh('continuous-swept-anatomical-hair',v,f,(.02,.015,.023))
layer=hair.data.uv_layers.new(name='authored-swept-hair-flow')
for loop in hair.data.loops:
 vi=loop.vertex_index
 if vi==center:layer.data[loop.index].uv=(.5,.5);continue
 ii=vi%(ns+1);jj=vi//(ns+1);tt=jj/nr;aa=math.tau*ii/ns
 layer.data[loop.index].uv=(ii/ns+1.15*tt*math.sin(aa)/math.tau,tt)
bm=bmesh.new();bm.from_mesh(hair.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=1e-6);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(hair.data);bm.free()
# Narrow fitted preauricular sideburns, independent of the helix silhouette.
# The coif boundary stays above the ear instead of wrapping around its tip.
for side in [-1,1]:
 vv=[];ff=[];steps=24;bands=2
 for i in range(steps+1):
  t=i/steps;y=3.06-.12*t;x=side*(.112+.032*math.sin(t*math.pi/2));half=.0002+.007*max(0,1-t)**.65
  for j in range(bands+1):
   xx=x+(j/bands*2-1)*half;vv.append((xx,y,front(xx,y,.0012)))
  if i<steps:
   for j in range(bands):a=i*(bands+1)+j;ff.append((a,a+bands+1,a+bands+2,a+1))
 o=mesh('fitted-hair-sideburn',vv,ff,(.02,.015,.023))
 uv=o.data.uv_layers.new(name='sideburn-flow')
 for loop in o.data.loops:
  vi=loop.vertex_index;uv.data[loop.index].uv=((vi%(bands+1))/bands,(vi//(bands+1))/steps)
 for p in o.data.polygons:
  if p.normal.z>0:p.flip()
 o.data.calc_loop_triangles()
 # Verify actual triangle interiors/edge midpoints, not just projected vertices.
 for iteration in range(6):
  for tri in o.data.loop_triangles:
   points=[o.data.vertices[i].co for i in tri.vertices]
   probes=[sum(points,Vector())/3]+[(points[j]+points[(j+1)%3])/2 for j in range(3)]
   correction=max(0,max(q.z-front(q.x,q.y)+.0003 for q in probes))
   if correction:
    for i in tri.vertices:o.data.vertices[i].co.z-=correction
 o.data.update()
# Small seated fangs at the actual upper vermilion; no oversized cone grin.
for side in [-1,1]:
 x=side*.022;y=2.96+(6.55+ANCHOR_SHIFT-EYE_Y)*.265;z=front(x,y)-.0002
 vv=[(x+.002*math.cos(i*math.tau/6),y,z+.002*math.sin(i*math.tau/6))for i in range(6)]+[(x,y-.007,z-.001),(x,y+.001,z)]
 ff=[(i,(i+1)%6,6)for i in range(6)]+[(7,(i+1)%6,i)for i in range(6)];mesh('small-fang',vv,ff,(.7,.65,.55))
# Exact runtime Float32 compilation, original UVs preserved where available.
result=[]
for o in list(bpy.context.scene.objects):
 if o.type!='MESH':continue
 m=o.data;m.update()
 if not m.uv_layers.active:
  bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.uv.smart_project(island_margin=.025);bpy.ops.object.mode_set(mode='OBJECT');o.select_set(False)
 m.calc_loop_triangles();uv=m.uv_layers.active;colors=m.color_attributes.get('COLOR_0');p=[];n=[];u=[];c=[]
 for tri in m.loop_triangles:
  if tri.area<1e-12:continue
  for li in tri.loops:
   vert=m.vertices[m.loops[li].vertex_index];p.extend(vert.co);n.extend(vert.normal);u.extend(uv.data[li].uv)
   if colors:c.extend(colors.data[vert.index].color[:3])
 result.append(dict(name=o.name,position=p,normal=n,uv=u,color=c))
triangles=sum(len(r['position'])//9 for r in result);assert triangles<=6000,('Head budget',triangles)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'authored-face.blend'),compress=True)
runpy.run_path(str(ROOT/'scripts/art/pack-dracula-face.py'))['write_packed_face'](result,ROOT/'src/visual/creatures/v2/generated/draculaFaceV4.ts',OUT)
(OUT/'mesh-budget.json').write_text(json.dumps({r['name']:len(r['position'])//9 for r in result},indent=2))
(OUT/'provenance.json').write_text(json.dumps({'source':'MakeHuman hm08 core graphical asset','license':'CC0','originalGitBlob':'d26635e9326e3cca30778fd7b9c00062b03cce09','sourceSha256':hashlib.sha256(SOURCE.read_bytes()).hexdigest(),'scope':'body head/neck plus actual helper eyeballs only; no application code','morphCoefficients':{name:1/3 for name in morph_files},'morphedEyeCenters':centers,'adaptation':'original stylization, neck closure, runtime decimation, projected iris/pupil, brows/coif/fangs'},indent=2))
print('AUTHORED_V4_HEAD_TRIANGLES',triangles)
