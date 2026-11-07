"""Current original school TEACHER face generator with actual orbital holes and integrated lid loops.
The former row-based girl path is historical only: current girl uses author-school-specter-anatomical.py.
Shared construction lesson from the rejected Dracula face; not shared character identity.
This is PRIVATE work until actual neutral multi-view pixels are independently reviewed.
"""
import bpy,bmesh,math,json,base64,struct
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree

def build(kind):
 ROOT=Path.cwd(); OUT=ROOT/'.art/school-authored-faces'/kind;OUT.mkdir(parents=True,exist_ok=True)
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
 rows=[(2.67,.055),(2.70,.074),(2.735,.095),(2.755,.104),(2.775,.111),(2.81,.12),(2.85,.139),(2.88,.149),(2.915,.15),(2.94,.148),(2.965,.15),(2.995,.145),(3.03,.14),(3.08,.124),(3.13,.085),(3.16,.018)]
 xs=[-1,-.9,-.75,-.5,-.25,-.125,0,.125,.25,.5,.75,.9,1]
 # Nose, lip and cheek landmarks are explicit row profiles, not additive spheres.
 profiles=[[-.06,-.055,-.04,-.015,0,.015],[-.105,-.10,-.075,-.04,-.025,.018],[-.13,-.122,-.09,-.055,-.035,.02],[-.151,-.138,-.103,-.068,-.045,.02],[-.146,-.14,-.11,-.075,-.05,.02],[-.133,-.125,-.112,-.085,-.058,.02],[-.19,-.17,-.125,-.10,-.065,.02],[-.21,-.16,-.13,-.105,-.07,.02],[-.181,-.142,-.12,-.102,-.07,.02],[-.168,-.137,-.115,-.099,-.07,.02],[-.154,-.14,-.13,-.11,-.075,.02],[-.14,-.137,-.129,-.106,-.07,.02],[-.127,-.123,-.11,-.087,-.06,.018],[-.105,-.10,-.09,-.069,-.048,.015],[-.07,-.067,-.055,-.043,-.03,.01],[-.012,-.012,-.01,-.008,-.005,.004]]
 knots=[0,.25,.5,.75,.9,1]
 original_rows=list(rows);original_profiles=list(profiles)
 new_rows=[(2.55,.095),(2.62,.09),(2.762,.122),(2.770,.124),(2.835,.135)]
 widths={2.67:.085,2.70:.088,2.735:.11,2.755:.12,2.775:.125,2.81:.126}
 rows=sorted([(y,widths.get(y,w))for y,w in rows]+new_rows)
 def row_profile(y):
  if y<2.67:return [-.075,-.071,-.055,-.025,-.01,.018]
  if y==2.835:return [-.16,-.165,-.12,-.095,-.062,.02]
  for i in range(len(original_rows)-1):
   ya=original_rows[i][0];yb=original_rows[i+1][0]
   if ya<=y<=yb:
    t=(y-ya)/(yb-ya);return [a*(1-t)+b*t for a,b in zip(original_profiles[i],original_profiles[i+1])]
  return original_profiles[-1]
 profiles=[row_profile(y)for y,w in rows]
 for y,values in {2.67:[-.085,-.082,-.06,-.025,-.01,.018],2.70:[-.115,-.111,-.085,-.045,-.025,.018],2.735:[-.139,-.129,-.098,-.058,-.035,.02],2.81:[-.142,-.13,-.11,-.08,-.055,.02],2.85:[-.188,-.175,-.125,-.10,-.065,.02],2.88:[-.195,-.155,-.13,-.105,-.07,.02]}.items():profiles[[r[0]for r in rows].index(y)]=values
 # Identity-specific school proportions, not vampire profiles.
 if kind=='girl':
  overrides={2.55:[-.04,-.038,-.03,-.015,-.005,.012],2.62:[-.045,-.042,-.03,-.015,-.005,.012],2.67:[-.065,-.062,-.05,-.025,-.01,.018],2.70:[-.105,-.1,-.075,-.04,-.025,.018],2.735:[-.12,-.115,-.09,-.055,-.035,.02],2.775:[-.153,-.143,-.11,-.075,-.05,.02],2.81:[-.155,-.143,-.112,-.085,-.058,.02],2.835:[-.150,-.145,-.12,-.095,-.062,.02],2.85:[-.160,-.148,-.124,-.10,-.065,.02],2.88:[-.170,-.150,-.130,-.105,-.07,.02],2.915:[-.160,-.140,-.12,-.102,-.07,.02]}
  widths_by_y={2.55:.045,2.62:.045,2.67:.045,2.70:.055,2.735:.075,2.755:.086,2.762:.090,2.770:.090,2.775:.095,2.81:.10,2.835:.118,2.85:.128,2.88:.14}
 else:
  overrides={2.67:[-.055,-.052,-.04,-.02,-.01,.018],2.70:[-.135,-.125,-.09,-.045,-.025,.018],2.775:[-.169,-.155,-.116,-.075,-.05,.02],2.81:[-.172,-.155,-.112,-.060,-.05,.02],2.835:[-.180,-.165,-.12,-.095,-.062,.02],2.85:[-.190,-.172,-.118,-.108,-.060,.02],2.88:[-.195,-.160,-.13,-.125,-.07,.02]}
  widths_by_y={2.55:.058,2.62:.052,2.67:.070,2.70:.090}
 for y,p in overrides.items():profiles[[r[0]for r in rows].index(y)]=p
 rows=[(y,widths_by_y.get(y,w)) for y,w in rows]
 row_at=lambda y:[r[0]for r in rows].index(y)
 orbit_rows=[row_at(y)for y in [2.915,2.94,2.965]]
 def depth(r,x):
  a=abs(x)
  if a==.125 and rows[r][0]==2.835:return -.145
  if a==.125 and rows[r][0]==2.85:return -.155 if kind=='girl' else -.181
  for k in range(5):
   if a<=knots[k+1]:
    t=(a-knots[k])/(knots[k+1]-knots[k]);return profiles[r][k]*(1-t)+profiles[r][k+1]*t
  return profiles[r][-1]
 verts=[];faces=[]
 for r,(y,w) in enumerate(rows):
  for x in xs:verts.append((x*w,y,depth(r,x)))
 idx=lambda r,c:r*len(xs)+c
 # Replace rectangle hole boundary with real orbital contours (shared with facial quad grid).
 eye_boundaries=[]
 for side,lo,hi in [(1,8,10),(-1,2,4)]:
  r0,r1,r2=orbit_rows
  seq=[(r0,lo),(r0,lo+1),(r0,hi),(r1,hi),(r2,hi),(r2,lo+1),(r2,lo),(r1,lo)]
  angles=[225,270,315,0,45,90,135,180]
  boundary=[]
  for (r,c),deg in zip(seq,angles):
   a=math.radians(deg);x=side*.075+.048*math.cos(a);y=2.94+.032*math.sin(a)+side*.08*(x-side*.075)
   # Upper orbital roof advances; lower rim remains a broad cheek transition.
   z=-.116-.027*max(0,math.sin(a))-.006*max(0,-math.sin(a))
   z-=.016*max(0,min(1,(.05-abs(x))/.023)) # Supported medial orbit joins the nasal bridge, no triangular tent.
   verts[idx(r,c)]=(x,y,z);boundary.append(idx(r,c))
  eye_boundaries.append((side,boundary,angles))
 for r in range(len(rows)-1):
  for c in range(len(xs)-1):
   if r in orbit_rows[:2] and c in (2,3,8,9):continue
   if r==row_at(2.835) and c in (4,7):continue
   if r==row_at(2.762) and c in (4,5,6,7):continue
   faces.append((idx(r,c),idx(r+1,c),idx(r+1,c+1),idx(r,c+1)))
 # Back cranium shares every left/right facial boundary, preserving a coherent skull/jaw shell.
 backs=[]
 for r,(y,w) in enumerate(rows):
  ring=[idx(r,len(xs)-1)]
  for i in range(1,6):
   a=math.pi*i/6;ring.append(len(verts));verts.append((w*math.cos(a),y,.018+((.035+.070*max(0,min(1,(y-2.64)/.25))) if y<3.03 else max(.008,(3.17-y)*.77))*math.sin(a)))
  ring.append(idx(r,0));backs.append(ring)
 for r in range(len(rows)-1):
  for i in range(6):faces.append((backs[r][i],backs[r][i+1],backs[r+1][i+1],backs[r+1][i]))
 for r in [0,len(rows)-1]:
  loop=[idx(r,c)for c in range(len(xs))]+backs[r][1:-1]
  center=len(verts);verts.append((0,rows[r][0],.01))
  for i in range(len(loop)):faces.append((center,loop[i],loop[(i+1)%len(loop)]))
 # Two broad concentric lid loops bridge the surrounding orbital topology to the eyeball.
 for side,boundary,angles in eye_boundaries:
  prev=boundary
  for level in [0,1]:
   ring=[]
   for deg,outer in zip(angles,boundary):
    a=math.radians(deg);dx=(.031 if kind=='teacher' else .034)*math.cos(a);dy=((.0065 if kind=='teacher' else .012) if math.sin(a)>0 else (.0115 if kind=='teacher' else .013))*math.sin(a)+side*(.24 if kind=='teacher' else .12)*dx
    x=side*.075+dx;y=2.94+dy
    z=-.095-.039*math.sqrt(max(.04,1-(dx/.039)**2-(dy/.031)**2))-.001
    inner=Vector((x,y,z));p=Vector(verts[outer]).lerp(inner,.58)if level==0 else inner
    if level==0:p.z-=.003 if math.sin(a)>0 else .001
    ring.append(len(verts));verts.append(tuple(p))
   for i in range(8):faces.append((prev[i],prev[(i+1)%8],ring[(i+1)%8],ring[i]))
   prev=ring

 # Place nasal openings on the sloping underside of the tip, not two frontal dots.
 for side,c0 in [(-1,4),(1,7)]:
  for rr,y in [(row_at(2.835),2.845),(row_at(2.85),2.849)]:
   for cc in [c0,c0+1]:
    x,_,z=verts[idx(rr,cc)]; inner=abs(xs[cc])<.2
    x=side*((.025 if kind=='teacher' else .016)+(-.0045 if inner else .0045))
    z=(-.161 if inner else -.151) if y<2.847 else (-.187 if inner else -.173)
    if kind=='girl':z+=.029
    verts[idx(rr,cc)]=(x,y,z)
 # Anatomical continuous lip margin: broad closed seam, shaped cupid centre and lowered corners.
 for rr,sign in [(row_at(2.762),-1),(row_at(2.770),1)]:
  for cc in range(4,9):
   x,_,z=verts[idx(rr,cc)];t=abs(x)/.031
   seam=2.766+.0015*(1-t)-.0015*t*t if kind=='teacher' else 2.770+.001*min(1,t)
   verts[idx(rr,cc)]=(x*(1.45 if kind=='teacher' else 1.1),seam+sign*.0011,z-.004)
 cavity_vertices=set()
 # Integrated nostril and oral recesses: shared surface boundaries turn inward, never bead overlays.
 for c in [4,7]:
  r=row_at(2.835);outer=[idx(r,c),idx(r+1,c),idx(r+1,c+1),idx(r,c+1)];inner=[]
  center=sum((Vector(verts[i])for i in outer),Vector())/4
  for i in outer:
   p=Vector(verts[i]).lerp(center,.18);p.z+=.018;inner.append(len(verts));verts.append(tuple(p))
  for i in range(4):faces.append((outer[i],outer[(i+1)%4],inner[(i+1)%4],inner[i]))
  faces.append(tuple(inner));cavity_vertices.update(inner)
 r=row_at(2.762);outer=[idx(r,c)for c in range(4,9)]+[idx(r+1,c)for c in range(8,3,-1)];inner=[]
 for i in outer:
  p=Vector(verts[i]);p.z+=.018;inner.append(len(verts));verts.append(tuple(p))
 for i in range(len(outer)):faces.append((outer[i],outer[(i+1)%len(outer)],inner[(i+1)%len(inner)],inner[i]))
 faces.append(tuple(inner));cavity_vertices.update(inner)

 def mesh(name,v,f,color,sub=0):
  m=bpy.data.meshes.new(name);m.from_pydata(v,[],f);m.update();o=bpy.data.objects.new(name,m);bpy.context.collection.objects.link(o)
  if name=='authored-school-face':
   mask=m.attributes.new(name='cavity_mask',type='FLOAT',domain='POINT')
   for i in cavity_vertices:mask.data[i].value=1
  for q in m.polygons:q.use_smooth=True
  mat=bpy.data.materials.new(name+'-material');mat.diffuse_color=(*color,1);o.data.materials.append(mat)
  bpy.context.view_layer.objects.active=o;o.select_set(True)
  if sub:
   md=o.modifiers.new('Authored surface subdivision','SUBSURF');md.levels=sub;bpy.ops.object.modifier_apply(modifier=md.name)
  bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
  bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.normals_make_consistent(inside=False);bpy.ops.uv.smart_project(island_margin=.025);bpy.ops.object.mode_set(mode='OBJECT');o.select_set(False)
  return o
 skin=mesh('authored-school-face',verts,faces,(.5,.43,.39),1)
 # Evaluated (post-subdivision) lids, not merely the control cage, must stay outside the eyeballs.
 projected=0
 for vert in skin.data.vertices:
  x,y,z=vert.co;side=1 if x>=0 else -1;dx=x-side*.075;dy=y-2.94
  radius2=(dx/.039)**2+(dy/.031)**2
  if radius2<.999 and z<-.075:
   front=-.095-.039*math.sqrt(1-radius2)
   if z>front-.003:vert.co.z=front-.003;projected+=1
 skin.data.update();skin.data.calc_loop_triangles();clearances=[]
 for tri in skin.data.loop_triangles:
  points=[skin.data.vertices[i].co.copy()for i in tri.vertices]
  samples=points+[(points[i]+points[(i+1)%3])*.5 for i in range(3)]+[sum(points,Vector())/3]
  for p in samples:
   side=1 if p.x>=0 else -1;r2=((p.x-side*.075)/.039)**2+((p.y-2.94)/.031)**2
   if r2<.999 and p.z<-.075:clearances.append(-.095-.039*math.sqrt(1-r2)-p.z)
 assert clearances and min(clearances)>.001, min(clearances)if clearances else 'no lid samples'
 (OUT/'evaluated-lid-clearance.json').write_text(json.dumps({'projectedVertices':projected,'sampleCount':len(clearances),'minimumFrontDepthClearance':min(clearances),'requiredMinimum':.001,'vertexTarget':.003,'sampleRule':'vertices,edge midpoints,triangle centroids against exact ellipsoid'},indent=2))

 # Controlled warm/cool plane coloration is authored on the actual skin, not scene illumination.
 col=skin.data.color_attributes.new(name='COLOR_0',type='FLOAT_COLOR',domain='POINT')
 for v in skin.data.vertices:
  x,y,z=v.co;orb=math.exp(-((abs(x)-.075)/.052)**2-((y-2.943)/.039)**2) if z<-.07 else 0
  temple=math.exp(-((abs(x)-.135)/.035)**2-((y-2.975)/.09)**2)
  hollow=math.exp(-((abs(x)-.10)/.038)**2-((y-2.82)/.07)**2)
  cavity=.30*skin.data.attributes['cavity_mask'].data[v.index].value
  col.data[v.index].color=(.95-.22*orb-.07*temple-.05*hollow-cavity,.90-.25*orb-.09*temple-.06*hollow-cavity,.89-.21*orb-.05*temple-.025*hollow-cavity,1)
 # Eyeballs are real ellipsoids seated behind lid openings. Iris/pupil follow their spherical surfaces.
 def eyeball(side):
  bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=8,location=(side*.075,2.94,-.095));o=bpy.context.object;o.name='authored-almond-sclera';o.scale=(.039,.031,.039);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
  for p in o.data.polygons:p.use_smooth=True
  for name,r,color,offset in [('school-iris',.017 if kind=='girl' else .0115,(.20,.025,.04),.0007),('school-pupil',.007 if kind=='girl' else .005,(.006,.005,.008),.0012)]:
   segments=16;rings=2 if name=='school-iris' else 1
   def point(rr,a):
    dx=rr*math.cos(a);dy=rr*math.sin(a)-.0015
    return (side*.075+dx,2.94+dy,-.095-.039*math.sqrt(max(.01,1-(dx/.039)**2-(dy/.031)**2))-offset)
   v=[point(0,0)];f=[]
   for j in range(1,rings+1):
    for i in range(segments):v.append(point(r*j/rings,math.tau*i/segments))
   for i in range(segments):f.append((0,1+i,1+(i+1)%segments))
   if rings==2:
    for i in range(segments):f.append((1+i,1+segments+i,1+segments+(i+1)%segments,1+(i+1)%segments))
   mesh(name,v,f,color)
 for side in [-1,1]:
  eyeball(side)
  # Broad flat eyebrow hairs and small pointed ears, not floating white eyelid tubes.
  tree=BVHTree.FromPolygons([v.co for v in skin.data.vertices],[p.vertices for p in skin.data.polygons])
  brow_v=[];brow_f=[]
  for j in range(25):
   t=j/24;x=side*(.033+.087*t);y=(2.964+.022*math.sin(t*math.pi*.65)) if kind=='teacher' else (2.978+.009*math.sin(t*math.pi*.7))
   for edge in [-1,1]:
    yy=y+edge*.0018*(1-.65*t);hit=tree.ray_cast(Vector((x,yy,-1)),Vector((0,0,1)))[0]
    assert hit is not None,'brow must be seated on skin'
    brow_v.append((x,yy,hit.z-.0008))
   if j:brow_f.append((2*j-2,2*j-1,2*j+1,2*j))
  clear=[]
  for q in brow_f:
   for tri in [(q[0],q[1],q[2]),(q[0],q[2],q[3])]:
    pp=[Vector(brow_v[i])for i in tri]
    for point in pp+[(pp[i]+pp[(i+1)%3])*.5 for i in range(3)]+[sum(pp,Vector())/3]:
     hit=tree.ray_cast(Vector((point.x,point.y,-1)),Vector((0,0,1)))[0]
     assert hit is not None
     clear.append(hit.z-point.z)
  correction=max(0,.0005-min(clear));assert correction<.003,'brow requires refitting, not floating offset'
  brow_v=[(x,y,z-correction) for x,y,z in brow_v]
  print('EVALUATED_BROW_CLEARANCE',kind,side,min(clear)+correction,'correction',correction)
  mesh('arched-natural-brow',brow_v,brow_f,(.015,.012,.02))
  bpy.ops.mesh.primitive_uv_sphere_add(segments=8,ring_count=6,location=(side*.145,2.925,.025));ear=bpy.context.object;ear.name='rounded-school-ear';ear.scale=(.021,.049,.018);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
  for p in ear.data.polygons:p.use_smooth=True
 # Mouth and nose are integrated recesses in the skin shell; school identities have no fangs.

 bm=bmesh.new();bm.from_mesh(skin.data)
 boundary=[e for e in bm.edges if e.is_boundary];nonmanifold=[e for e in bm.edges if not e.is_manifold and not e.is_boundary]
 assert len(boundary)==32 and not nonmanifold, (len(boundary),len(nonmanifold))
 (OUT/'topology-check.json').write_text(json.dumps({'vertices':len(bm.verts),'faces':len(bm.faces),'boundaryEdges':len(boundary),'nonManifoldEdges':len(nonmanifold),'intentionalOpenings':'two integrated eye rims'},indent=2));bm.free()
 # Compile evaluated exact triangulated buffers; UV seams are expanded, normals remain shared smooth.
 result=[]
 for o in list(bpy.context.scene.objects):
  if o.type!='MESH':continue
  bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.transform_apply(location=True,rotation=True,scale=True);o.select_set(False)
  m=o.data
  for vert in m.vertices:
   x,y,z=vert.co
   if kind=='girl':
    lift=(.018*math.exp(-((y-2.78)/.065)**2)*max(0,min(1,(-z-.035)/.07))) if y<2.90 else 0
    d=max(0,2.85-y);f=max(0,min(1,(y-2.55)/.12));jaw=.4*d*(1-math.exp(-(d/.06)**2))*(f*f*(3-2*f))
    vert.co=(x*.95,2.32+(y+lift+jaw-2.67)*(.44/.49),z-.012)
   else:vert.co=(x,y-.19,z-.025)
  if kind=='girl' and o.name=='authored-school-face':
   # Local sculpt smoothing of lateral/posterior mandible, never an entire row warp.
   # Eye/nose/lip landmarks are excluded; smooth the actual side contour after proportion mapping.
   neighbours=[set() for _ in m.vertices]
   for edge in m.edges:
    a,b=edge.vertices;neighbours[a].add(b);neighbours[b].add(a)
   weights=[]
   for vert in m.vertices:
    x,y,z=vert.co
    lateral=max(0,min(1,(abs(x)-.04)/.035)) if z<.015 else 1
    band=max(0,1-((y-2.465)/.055)**2)
    weights.append(lateral*band*band if 2.41<y<2.52 else 0)
   for iteration in range(10):
    old=[v.co.copy()for v in m.vertices]
    for i,vert in enumerate(m.vertices):
     if weights[i] and neighbours[i]:
      mean=sum((old[j]for j in neighbours[i]),Vector())/len(neighbours[i])
      vert.co=old[i].lerp(mean,.38*weights[i])
   # Ordered mandibular return rises toward the posterior under-ear angle, not a horizontal mouth-height ring.
   for vert in m.vertices:
    x,y,z=vert.co
    depth=max(0,min(1,(z+.11)/.18));depth=depth*depth*(3-2*depth)
    band=math.exp(-((y-2.465)/.065)**2)
    vert.co.y+=.025*depth*band
    # Keep the restrained lower lip rounded rather than a projecting narrow ledge.
    if z<-.10:vert.co.z+=.004*math.exp(-((y-2.45)/.012)**2-(x/.03)**2)
  m.update()
  if any(k in o.name for k in ['school-iris','pupil','natural-brow','restrained-mouth']):
   for poly in m.polygons:
    if poly.normal.z>0:poly.flip()
   m.update()
  m.calc_loop_triangles();uv=m.uv_layers.active
  if not uv:
   bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.uv.smart_project(island_margin=.025);bpy.ops.object.mode_set(mode='OBJECT');o.select_set(False);uv=m.uv_layers.active
  colors=m.color_attributes.get('COLOR_0');p=[];n=[];u=[];c=[]
  for tri in m.loop_triangles:
   if tri.area<1e-12:continue
   for li in tri.loops:
    loop=m.loops[li];vert=m.vertices[loop.vertex_index];p.extend(vert.co);n.extend(vert.normal);u.extend(uv.data[li].uv)
    if colors:c.extend(colors.data[vert.index].color[:3])
  result.append(dict(name=o.name,position=p,normal=n,uv=u,color=c))
 # Keep editable topology and modifiers-applied exact source, plus compile data.
 bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'authored-school-face.blend'))
 values=[];metadata=[]
 for part in result:
  item={'name':part['name']}
  for field in ['position','normal','uv','color']:
   item[field]=[len(values),len(part[field])];values.extend(part[field])
  metadata.append(item)
 (OUT/'float32-pack-input.json').write_text(json.dumps(result,separators=(',',':')))
 payload={'data':base64.b64encode(struct.pack('<'+'f'*len(values),*values)).decode(),'parts':metadata}
 path=ROOT/('src/visual/creatures/v2/generated/school'+kind.title()+'Face.ts');path.write_text('// Lossless Float32 geometry; original editable topology is retained.\nimport { decodeAuthoredMeshes } from \'../DecodedAuthoredMesh\';\nexport const authoredSchoolFace = decodeAuthoredMeshes('+json.dumps(payload,separators=(',',':'))+');\n')
 (OUT/'mesh-budget.json').write_text(json.dumps({r['name']:len(r['position'])//9 for r in result},indent=2))
 print('AUTHORED_FACE_TRIANGLES',sum(len(r['position'])//9 for r in result))

build("teacher")  # Never overwrite the current CC0-derived specter with the rejected historical row head.
