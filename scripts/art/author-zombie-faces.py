"""Three zombie identities: editable anatomical quad landmarks and exact runtime compilation.
Uses explicit orbital/lid loops, broad squared jaw, flat cranium, integrated nasal/labial planes.
Coordinates in this authoring mesh are runtime Three.js Y-up; review GLB Blender import is Z-up.
"""
import bpy, math, json, struct, base64, hashlib, subprocess, sys
from pathlib import Path
from mathutils import Vector
KIND=sys.argv[sys.argv.index('--')+1] if '--' in sys.argv else 'giantZombie'
assert KIND in ['zombie','giantZombie','zombieKing']
ROOT=Path.cwd();OUT=ROOT/'.art'/('authored-face-'+KIND);OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
rows=[(2.2,.13),(2.32,.18),(2.39,.26),(2.44,.28),(2.457,.283),(2.465,.285),(2.473,.285),(2.49,.285),(2.55,.285),(2.58,.29),(2.63,.29),(2.66,.29),(2.69,.29),(2.72,.29),(2.76,.29),(2.83,.285),(2.93,.275),(2.99,.25)]
xs=[-1,-.9,-.75,-.5,-.25,-.125,0,.125,.25,.5,.75,.9,1];knots=[0,.25,.5,.75,.9,1]
profiles=[[-.11,-.105,-.09,-.06,-.03,.01],[-.20,-.195,-.17,-.11,-.05,.0],[-.30,-.29,-.24,-.17,-.08,-.005],[-.335,-.32,-.26,-.18,-.08,-.005],[-.325,-.31,-.25,-.18,-.08,-.005],[-.295,-.285,-.245,-.18,-.08,-.005],[-.325,-.31,-.25,-.18,-.08,-.005],[-.33,-.315,-.26,-.18,-.08,-.005],[-.345,-.305,-.245,-.18,-.08,.0],[-.395,-.35,-.255,-.185,-.08,.0],[-.36,-.285,-.245,-.18,-.075,.0],[-.315,-.26,-.235,-.175,-.07,.0],[-.29,-.245,-.23,-.17,-.07,.0],[-.28,-.27,-.255,-.18,-.07,.0],[-.275,-.275,-.26,-.18,-.07,.0],[-.25,-.245,-.23,-.165,-.06,.0],[-.22,-.215,-.20,-.15,-.06,.005],[-.19,-.185,-.17,-.13,-.05,.005]]
insert=9;rows.insert(insert,(2.56,.2867));profiles.insert(insert,[a*(2/3)+b/3 for a,b in zip(profiles[8],profiles[9])])
row_at=lambda y:[r[0] for r in rows].index(y)
orb=[row_at(y)for y in [2.66,2.69,2.72]]
def depth(r,x):
 a=abs(x)
 for k in range(5):
  if a<=knots[k+1]:
   t=(a-knots[k])/(knots[k+1]-knots[k]);return profiles[r][k]*(1-t)+profiles[r][k+1]*t
 return profiles[r][-1]
verts=[];faces=[]
for r,(y,w) in enumerate(rows):
 for x in xs:
  frown=-.032*min(1,abs(x*w)/.16)*math.exp(-((y-2.465)/.04)**2)
  verts.append((x*w,y+frown,depth(r,x)))
idx=lambda r,c:r*len(xs)+c
eye_boundaries=[]
for side,lo,hi in [(1,8,10),(-1,2,4)]:
 r0,r1,r2=orb;seq=[(r0,lo),(r0,lo+1),(r0,hi),(r1,hi),(r2,hi),(r2,lo+1),(r2,lo),(r1,lo)]
 angles=[225,270,315,0,45,90,135,180];boundary=[]
 for (r,c),deg in zip(seq,angles):
  a=math.radians(deg);x=side*.135+.094*math.cos(a);y=2.69+.055*math.sin(a)+side*.25*(x-side*.135)
  z=-.235-.045*max(0,math.sin(a))-.01*max(0,-math.sin(a))-.018*max(0,-side*math.cos(a))*max(0,math.sin(a))+.025*max(0,side*math.cos(a));verts[idx(r,c)]=(x,y,z);boundary.append(idx(r,c))
 eye_boundaries.append((side,boundary,angles))
for r in range(len(rows)-1):
 for c in range(len(xs)-1):
  if r in orb[:2] and c in (2,3,8,9):continue
  if r==row_at(2.55) and c in (4,7):continue
  if r==row_at(2.457) and c in (3,4,5,6,7,8):continue
  faces.append((idx(r,c),idx(r+1,c),idx(r+1,c+1),idx(r,c+1)))
backs=[]
for r,(y,w) in enumerate(rows):
 ring=[idx(r,len(xs)-1)]
 for i in range(1,10):
  a=math.pi*i/10;ring.append(len(verts));verts.append((w*math.cos(a),y,.01+(.20 if y>2.4 else .13)*math.sin(a)))
 ring.append(idx(r,0));backs.append(ring)
for r in range(len(rows)-1):
 for i in range(10):faces.append((backs[r][i],backs[r][i+1],backs[r+1][i+1],backs[r+1][i]))
for r in [0,len(rows)-1]:
 loop=[idx(r,c)for c in range(len(xs))]+backs[r][1:-1];center=len(verts);verts.append((0,rows[r][0],.01))
 for i in range(len(loop)):faces.append((center,loop[i],loop[(i+1)%len(loop)]))
for side,boundary,angles in eye_boundaries:
 prev=boundary
 for level in [0,1]:
  ring=[]
  for deg,outer in zip(angles,boundary):
   a=math.radians(deg);dx=.070*math.cos(a);dy=(.021 if math.sin(a)>0 else .017)*math.sin(a)+side*.25*dx-.004
   x=side*.135+dx;y=2.69+dy;z=-.203-.064*math.sqrt(max(.04,1-(dx/.082)**2-(dy/.055)**2))-.002
   inner=(x,y,z);point=tuple(verts[outer][i]*(1-.58)+inner[i]*.58 for i in range(3))if level==0 else inner
   ring.append(len(verts));verts.append(point)
  for i in range(8):faces.append((prev[i],prev[(i+1)%8],ring[(i+1)%8],ring[i]))
  prev=ring
# Recessed nostrils and oral cavity use shared skin boundaries and closed inset floors.
for c in [4,7]:
 r=row_at(2.55);outer=[idx(r,c),idx(r+1,c),idx(r+1,c+1),idx(r,c+1)];center=sum((Vector(verts[i])for i in outer),Vector())/4;inner=[]
 for i in outer:
  point=Vector(verts[i]).lerp(center,.15);point.z+=.025;inner.append(len(verts));verts.append(tuple(point))
 for i in range(4):faces.append((outer[i],outer[(i+1)%4],inner[(i+1)%4],inner[i]))
 faces.append(tuple(inner))
r=row_at(2.457);outer=[idx(r,c)for c in range(3,10)]+[idx(r+1,c)for c in range(9,2,-1)];inner=[]
for i in outer:
 point=Vector(verts[i]);point.z+=.025;inner.append(len(verts));verts.append(tuple(point))
for i in range(len(outer)):faces.append((outer[i],outer[(i+1)%len(outer)],inner[(i+1)%len(inner)],inner[i]))
faces.append(tuple(inner))
roles={}
def mesh(name,v,f,role,color,sub=0):
 m=bpy.data.meshes.new(name);m.from_pydata(v,[],f);m.update();o=bpy.data.objects.new(name,m);bpy.context.collection.objects.link(o);roles[name]=(role,color)
 for p in m.polygons:p.use_smooth=True
 mat=bpy.data.materials.new(name+'-material');mat.diffuse_color=(*color,1);mat.use_nodes=True;mat.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(*color,1);o.data.materials.append(mat)
 bpy.context.view_layer.objects.active=o;o.select_set(True)
 if sub:md=o.modifiers.new('Authored quad surface subdivision','SUBSURF');md.levels=sub;bpy.ops.object.modifier_apply(modifier=md.name)
 bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.normals_make_consistent(inside=False);bpy.ops.uv.smart_project(island_margin=.02);bpy.ops.object.mode_set(mode='OBJECT');o.select_set(False);return o
skin=mesh('frankenstein-continuous-orbital-lid-nose-lip-quad-shell',verts,faces,'skin',(.748,.815,.58),1)
# Taper the lateral orbital roof continuously into the temple, retaining the medial roof.
for vertex in skin.data.vertices:
 x,y,z=vertex.co
 if abs(x)>.18 and 2.69<y<2.84 and z<0:
  t=min(1,max(0,(abs(x)-.18)/.08));t=t*t*(3-2*t)
  band=math.exp(-((y-2.755)/.065)**4)
  temple=-.235*math.sqrt(max(0,1-(x/.29)**2))
  vertex.co.z=z+(max(z,temple)-z)*t*band
# Subdivision must not let the eyelid skin sink behind the actual eyeball.
for vertex in skin.data.vertices:
 x,y,z=vertex.co
 for side in [-1,1]:
  dx=(x-side*.135)/.082;dy=(y-2.69)/.055;r2=dx*dx+dy*dy
  if r2<1.04 and z<-.16:
   envelope=-.203-.064*math.sqrt(max(0,1-r2))-.009
   if z>envelope:vertex.co.z=envelope
# Continuous stern supraorbital/cheek and lip planes, not applied brow/lip rods.
for vertex in skin.data.vertices:
 x,y,z=vertex.co
 if z<-.12:
  medial=math.exp(-((abs(x)-.085)/.075)**2-((y-2.75)/.046)**2)
  vertex.co.y-=.018*medial
  vertex.co.z-=.022*medial
  lip=math.exp(-((y-2.48)/.043)**2)*math.exp(-(x/.20)**8)
  vertex.co.x*=1+.15*lip
  vertex.co.z-=.016*lip
skin.data.update()
col=skin.data.color_attributes.new(name='COLOR_0',type='FLOAT_COLOR',domain='POINT')
for v in skin.data.vertices:
 x,y,z=v.co
 orbit=math.exp(-((abs(x)-.135)/.09)**2-((y-2.69)/.05)**2)if z<-.18 else 0
 my=2.465-.032*min(1,abs(x)/.16);mouth=math.exp(-((y-my)/.006)**2)*math.exp(-(x/.15)**8)if z<-.25 else 0
 nostril=math.exp(-((abs(x)-.064)/.023)**2-((y-2.548)/.012)**2)if z<-.27 else 0
 shade=1-.27*orbit-.64*mouth-.48*nostril;col.data[v.index].color=(shade,shade,shade,1)
for side in [-1,1]:
 bpy.ops.mesh.primitive_uv_sphere_add(segments=12 if KIND=='zombie' else 16,ring_count=8 if KIND=='zombie' else 10,location=(side*.135,2.69,-.203));o=bpy.context.object;o.name='frankenstein-seated-sclera-'+str(side);o.scale=(.082,.055,.064);bpy.ops.object.transform_apply(location=True,rotation=False,scale=True);roles[o.name]=('eye',(.075,.10,.05))
 for p in o.data.polygons:p.use_smooth=True
 for name,r,color,offset in [('amber-iris',.026,(.38,.22,.045),.0007),('dark-pupil',.010,(.008,.01,.006),.0012)]:
  v=[(side*.135,2.685,-.203-.064*math.sqrt(1-(.005/.055)**2)-offset)];f=[];segments=16 if KIND=='zombie' else 24
  for j in [1,2]:
   for i in range(segments):
    rr=r*j/2;a=math.tau*i/segments;dx=rr*math.cos(a);dy=rr*math.sin(a)-.005;zz=-.203-.064*math.sqrt(max(.01,1-(dx/.082)**2-(dy/.055)**2))-offset;v.append((side*.135+dx,2.69+dy,zz))
  for i in range(segments):f.append((0,1+i,1+(i+1)%segments));a=1+i;b=1+(i+1)%segments;f.append((a,a+segments,b+segments,b))
  mesh('frankenstein-'+name+'-'+str(side),v,f,'eye',color)
# Species-specific skeletal proportions, not a recolored flat-top Frank head.
# Giant: broad lower jaw/short bridge, worker: asymmetric slack cheek, king: gaunt jaw and long bridge.
for o in list(bpy.context.scene.objects):
 if o.type!='MESH':continue
 for v in o.data.vertices:
  x,y,z=v.co
  if KIND=='giantZombie':
   jaw=math.exp(-((y-2.43)/.17)**2);v.co.x=x*(1.02+.27*jaw);v.co.z=z-.045*jaw*(max(0,1-(x/.35)**2));v.co.y=2.69+(y-2.69)*.91
  elif KIND=='zombieKing':
   jaw=math.exp(-((y-2.43)/.16)**2);cheek=math.exp(-((y-2.61)/.10)**2);v.co.x=x*(1-.04*jaw+.04*cheek);v.co.z=z-.03*math.exp(-(x/.06)**2-((y-2.60)/.12)**2);v.co.y=2.69+(y-2.69)*1.04
  else:
   v.co.x=x*(1-.08*math.exp(-((y-2.85)/.12)**2)+.09*math.exp(-((y-2.43)/.15)**2));v.co.y=y+.012*math.sin(x*8)*math.exp(-((y-2.53)/.22)**2);v.co.z=z-.018*math.exp(-((x+.13)/.11)**2-((y-2.44)/.1)**2)
  if y>2.83:
   crown_t=min(1,(y-2.83)/.16);crown_scale=1-.55*crown_t
   v.co.x*=crown_scale;v.co.z*=crown_scale
 o.data.update()
 if KIND=='zombie' and 'quad-shell' in o.name:
  bpy.context.view_layer.objects.active=o
  dec=o.modifiers.new('Mobile worker anatomical LOD','DECIMATE');dec.ratio=.29;dec.use_collapse_triangulate=True;bpy.ops.object.modifier_apply(modifier=dec.name)
 # Indexed authored surface normals are recalculated here before UV expansion.
 bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.normals_make_consistent(inside=False);bpy.ops.object.mode_set(mode='OBJECT');o.select_set(False)
result=[]
for o in list(bpy.context.scene.objects):
 if o.type!='MESH':continue
 m=o.data
 if 'iris' in o.name or 'pupil' in o.name:
  for q in m.polygons:
   if q.normal.z>0:q.flip()
  m.update()
 m.calc_loop_triangles();uv=m.uv_layers.active
 if not uv:
  bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.uv.smart_project(island_margin=.02);bpy.ops.object.mode_set(mode='OBJECT');o.select_set(False);uv=m.uv_layers.active
 colors=m.color_attributes.get('COLOR_0');p=[];n=[];u=[];c=[]
 for tri in m.loop_triangles:
  for li in tri.loops:
   loop=m.loops[li];v=m.vertices[loop.vertex_index];p.extend(v.co);n.extend(v.normal);u.extend(uv.data[li].uv)
   if colors:c.extend(colors.data[v.index].color[:3])
 def pack(a):return base64.b64encode(struct.pack('<%sf'%len(a),*a)).decode()
 result.append(dict(name=o.name.replace('frankenstein',KIND),role=roles[o.name][0],color=roles[o.name][1],count=len(p)//3,position=pack(p),normal=pack(n),uv=pack(u),vertexColor=pack(c)if c else ''))
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/('authored-'+KIND+'-face.blend')))
path=ROOT/('src/visual/creatures/v2/generated/'+KIND+'Face.ts');path.parent.mkdir(parents=True,exist_ok=True);path.write_text('// Generated by author-zombie-faces.py: species-authored quad topology, Float32 LE buffers.\nexport const authoredZombieFace='+json.dumps(result,separators=(',',':'))+';\n')
subprocess.run(['pnpm','exec','prettier','--write',str(path)],cwd=ROOT,check=True,stdout=subprocess.DEVNULL)
(OUT/'face-manifest.json').write_text(json.dumps({'triangles':sum(r['count']//3 for r in result),'parts':{r['name']:r['count']//3 for r in result},'generatedSourceSha256':hashlib.sha256(path.read_bytes()).hexdigest()},indent=2))
print('AUTHORED_ZOMBIE_FACE_TRIANGLES',sum(r['count']//3 for r in result))
