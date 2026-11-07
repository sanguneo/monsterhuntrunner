# HISTORICAL rejected row-built face workflow, retained for recovery/provenance.
# Current: author-sea-witch-cc0-study.py + prepare-sea-witch-cc0-runtime.py; validate-witch-cc0-study.py.
"""Original aquatic facial landmarks and real eyelid openings; exact runtime topology.
Shared quad-shell construction technique with the castle study, independently authored proportions.
No vampire identity, pointed ears, fangs, or beauty-only subdivision is copied.
"""
import sys
if '--allow-historical-runtime-overwrite' not in sys.argv:
    raise SystemExit('Historical rejected workflow is disabled by default. Use author-sea-witch-cc0-study.py and prepare-sea-witch-cc0-runtime.py. Recovery-only opt-in: --allow-historical-runtime-overwrite (overwrites current runtime data).')
import bpy,bmesh,math,json,pathlib
from mathutils import Vector
root=pathlib.Path.cwd();out=root/'.art/sea-witch-face-authored';out.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
rows=[(-.24,.045),(-.215,.07),(-.18,.10),(-.16,.115),(-.14,.125),(-.10,.145),(-.055,.158),(-.02,.16),(.015,.158),(.04,.155),(.065,.15),(.095,.145),(.13,.14),(.17,.125),(.205,.09),(.23,.018)]
xs=[-1,-.9,-.75,-.5,-.25,-.125,0,.125,.25,.5,.75,.9,1];knots=[0,.25,.5,.75,.9,1]
profiles=[[-.045,-.043,-.035,-.018,-.008,.01],[-.075,-.073,-.058,-.032,-.012,.015],[-.103,-.099,-.08,-.048,-.025,.018],[-.132,-.125,-.095,-.062,-.035,.02],[-.14,-.13,-.10,-.072,-.045,.02],[-.121,-.115,-.112,-.09,-.055,.02],[-.181,-.15,-.125,-.095,-.06,.02],[-.17,-.14,-.125,-.10,-.065,.02],[-.15,-.128,-.115,-.095,-.065,.02],[-.14,-.125,-.114,-.095,-.065,.02],[-.139,-.132,-.123,-.103,-.068,.02],[-.13,-.127,-.115,-.093,-.06,.018],[-.118,-.115,-.102,-.08,-.05,.015],[-.095,-.092,-.08,-.06,-.04,.01],[-.06,-.057,-.048,-.034,-.02,.007],[-.01,-.01,-.008,-.006,-.003,.003]]
# Additional shared anatomical rows define the alae and a true oral crease.
oldrows=rows;oldprofiles=profiles
rows=sorted(oldrows+[(-.151,.12),(-.145,.122),(-.075,.153),(-.064,.156)])
def interp_profile(y):
 for i in range(len(oldrows)-1):
  if oldrows[i][0]<=y<=oldrows[i+1][0]:
   t=(y-oldrows[i][0])/(oldrows[i+1][0]-oldrows[i][0]);return [a*(1-t)+b*t for a,b in zip(oldprofiles[i],oldprofiles[i+1])]
 return oldprofiles[-1]
profiles=[interp_profile(y) for y,w in rows]
row_at=lambda y:[r[0] for r in rows].index(y)
for y,profile in {-.10:[-.153,-.142,-.124,-.094,-.055,.02],-.075:[-.164,-.141,-.128,-.094,-.055,.02],-.064:[-.173,-.153,-.125,-.096,-.058,.02],-.055:[-.180,-.15,-.128,-.10,-.06,.02],-.02:[-.167,-.142,-.13,-.10,-.065,.02],-.16:[-.151,-.14,-.105,-.068,-.04,.02],-.151:[-.138,-.135,-.10,-.065,-.04,.02],-.145:[-.145,-.139,-.102,-.069,-.043,.02],-.14:[-.151,-.14,-.10,-.072,-.045,.02]}.items():profiles[row_at(y)]=profile
orbit_rows=[row_at(y) for y in [.015,.04,.065]]
for y in [.015,.04,.065]:profiles[row_at(y)][4]=-.095
profiles[row_at(.095)][4]=-.082
def depth(r,x):
 a=abs(x)
 if rows[r][0] in [-.02,.015,.04] and a==.125:return profiles[r][0]+.003
 if rows[r][0] in [-.02,.015,.04] and a==.25:return profiles[r][1]+.007
 if rows[r][0]==-.055 and a==.125:return profiles[r][0]+.006
 if rows[r][0]==-.055 and a==.25:return profiles[r][1]+.006
 if rows[r][0]==-.064 and a==.25:return -.157
 if a==.125 and rows[r][0]==-.075:return -.151
 if a==.125 and rows[r][0]==-.064:return -.168
 for k in range(5):
  if a<=knots[k+1]:
   t=(a-knots[k])/(knots[k+1]-knots[k]);return profiles[r][k]*(1-t)+profiles[r][k+1]*t
 return profiles[r][-1]
verts=[(x*w,y,depth(r,x)) for r,(y,w) in enumerate(rows) for x in xs];faces=[];cavity_vertices=set();idx=lambda r,c:r*len(xs)+c;boundaries=[]
for side,lo,hi in [(1,8,10),(-1,2,4)]:
 r0,r1,r2=orbit_rows;seq=[(r0,lo),(r0,lo+1),(r0,hi),(r1,hi),(r2,hi),(r2,lo+1),(r2,lo),(r1,lo)];angles=[225,270,315,0,45,90,135,180];boundary=[]
 for (r,c),deg in zip(seq,angles):
  a=math.radians(deg);x=side*.074+.047*math.cos(a);y=.04+.030*math.sin(a)+side*.14*(x-side*.074);z=-.111-.027*max(0,math.sin(a))-.006*max(0,-math.sin(a));verts[idx(r,c)]=(x,y,z);boundary.append(idx(r,c))
 boundaries.append((side,boundary,angles))
for r in range(len(rows)-1):
 for c in range(len(xs)-1):
  if r in orbit_rows[:2] and c in (2,3,8,9):continue
  if r==row_at(-.075) and c in (4,7):continue
  if r==row_at(-.151) and c in (4,5,6,7):continue
  faces.append((idx(r,c),idx(r+1,c),idx(r+1,c+1),idx(r,c+1)))
backs=[]
for r,(y,w) in enumerate(rows):
 ring=[idx(r,len(xs)-1)]
 for i in range(1,10):
  a=math.pi*i/10;ring.append(len(verts));verts.append((w*math.cos(a),y,.018+(.10 if y<.13 else max(.008,(.24-y)*.85))*math.sin(a)))
 ring.append(idx(r,0));backs.append(ring)
for r in range(len(rows)-1):
 for i in range(10):faces.append((backs[r][i],backs[r][i+1],backs[r+1][i+1],backs[r+1][i]))
for r in [0,len(rows)-1]:
 loop=[idx(r,c) for c in range(len(xs))]+backs[r][1:-1];center=len(verts);verts.append((0,rows[r][0],.01))
 for i in range(len(loop)):faces.append((center,loop[i],loop[(i+1)%len(loop)]))
for side,boundary,angles in boundaries:
 prev=boundary
 for level in [0,1]:
  ring=[]
  for deg,outer in zip(angles,boundary):
   a=math.radians(deg);dx=.034*math.cos(a);dy=(.0075 if math.sin(a)>0 else .0125)*math.sin(a)+side*.14*dx;x=side*.074+dx;y=.04+dy
   z=-.092-.037*math.sqrt(max(.04,1-(dx/.038)**2-(dy/.029)**2))-.001
   inner=Vector((x,y,z));p=Vector(verts[outer]).lerp(inner,.58) if level==0 else inner
   if level==0:p.z-=.0025 if math.sin(a)>0 else .001
   ring.append(len(verts));verts.append(tuple(p))
  for i in range(8):faces.append((prev[i],prev[(i+1)%8],ring[(i+1)%8],ring[i]))
  prev=ring
# Recesses share the nasal/oral boundary with the facial shell.
for row,columns,depthInset in [(-.075,[4],.018),(-.075,[7],.018),(-.151,[4,5,6,7],.014)]:
 r=row_at(row);lo=min(columns);hi=max(columns)+1
 outer=[idx(r,c) for c in range(lo,hi+1)]+[idx(r+1,c) for c in range(hi,lo-1,-1)]
 center=sum((Vector(verts[i]) for i in outer),Vector())/len(outer);inner=[]
 for i in outer:
  if row==-.075:
   p=Vector(verts[i]);p.x=center.x*.72+(p.x-center.x)*.48;p.y=center.y+(p.y-center.y)*.55;verts[i]=tuple(p)
  if row==-.151:
   p=Vector(verts[i]);width=max(abs(verts[j][0]) for j in outer);t=min(1,abs(p.x)/width);upper=p.y>center.y
   p.y=center.y+(1 if upper else -1)*(.00035+.0024*(1-t*t))
   if upper:p.y+=.0012*math.sin(math.pi*t)
   p.z=-.141+.011*t*t;verts[i]=tuple(p)
  p=Vector(verts[i]).lerp(center,.12);p.z+=depthInset;inner.append(len(verts));cavity_vertices.add(len(verts));verts.append(tuple(p))
 for i in range(len(outer)):faces.append((outer[i],outer[(i+1)%len(outer)],inner[(i+1)%len(inner)],inner[i]))
 faces.append(tuple(inner))
# Shorter lower facial proportions; eyes retain the independently checked placement.
verts=[(x,y+(.024*math.exp(-((y+.145)/.035)**2)*math.exp(-(x/.06)**4) if y<-.09 and z<-.07 else 0),z) for x,y,z in verts]
verts=[(x,-.055+(y+.055)*.82 if y<-.055 else y,z) for x,y,z in verts]
source=bpy.data.collections.new('EDITABLE_AQUATIC_LANDMARKS');bpy.context.scene.collection.children.link(source)
def mesh(name,v,f,sub=0):
 me=bpy.data.meshes.new(name);me.from_pydata(v,[],f);me.update();o=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(o);bpy.context.view_layer.objects.active=o;o.select_set(True)
 if name=='aquatic-face-skin':
  colors=me.color_attributes.new(name='COLOR_0',type='FLOAT_COLOR',domain='POINT')
  for vertex in me.vertices:
   x,y,z=vertex.co;orbit=math.exp(-((abs(x)-.074)/.049)**2-((y-.043)/.037)**2) if z<-.07 else 0;hollow=math.exp(-((abs(x)-.10)/.04)**2-((y+.065)/.06)**2) if z<-.07 else 0;dark=.38 if vertex.index in cavity_vertices else 0
   colors.data[vertex.index].color=(.94-.13*orbit-.045*hollow-dark,.98-.11*orbit-.025*hollow-dark,1-.08*orbit-dark,1)
   if vertex.index not in cavity_vertices and -.125<y<-.105 and abs(x)<.037 and z<-.115:colors.data[vertex.index].color=(.94,.68,.72,1)
  original=o.copy();original.data=o.data.copy();source.objects.link(original);original.name='Editable_facial_quad_landmarks';original.hide_render=True;original.hide_set(True)
 if sub:
  m=o.modifiers.new('Exact authored subdivision','SUBSURF');m.levels=sub;bpy.ops.object.modifier_apply(modifier=m.name)
  o.data.calc_loop_triangles();m=o.modifiers.new('Face curvature budget','DECIMATE');m.ratio=1900/len(o.data.loop_triangles);m.use_collapse_triangulate=True;bpy.ops.object.modifier_apply(modifier=m.name)
 bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(o.data);bm.free()
 for p in o.data.polygons:p.use_smooth=True
 bpy.ops.object.select_all(action='DESELECT');o.hide_set(False);o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.uv.smart_project(island_margin=.025);bpy.ops.object.mode_set(mode='OBJECT');o.select_set(False);return o
skin=mesh('aquatic-face-skin',verts,faces,1)
# Subdivision shrinks orbital rims. Seat the evaluated skin outside the actual eye,
# not merely the pre-subdivision landmark sphere; preserve a .002 unit chord margin.
corrected_lid_vertices=0
for vertex in skin.data.vertices:
 x,y,z=vertex.co;side=1 if x>0 else -1;dx=x-side*.074;dy=y-.04;radial=(dx/.038)**2+(dy/.029)**2
 if radial<1 and z<-.065:
  front=-.092-.037*math.sqrt(max(0,1-radial))-.002
  if z>front:vertex.co.z=front;corrected_lid_vertices+=1
skin.data.update()
# The facial shell has exactly two deliberate eye openings and no accidental holes.
bm=bmesh.new();bm.from_mesh(skin.data);boundary=[e for e in bm.edges if e.is_boundary];assert all(e.is_manifold or e.is_boundary for e in bm.edges)
seen=set();eye_loops=0
for e in boundary:
 if e in seen:continue
 eye_loops+=1;todo=[e];seen.add(e)
 while todo:
  current=todo.pop()
  for vertex in current.verts:
   neighbors=[edge for edge in vertex.link_edges if edge.is_boundary];assert len(neighbors)==2
   for edge in neighbors:
    if edge not in seen:seen.add(edge);todo.append(edge)
assert eye_loops==2,eye_loops
rim_vertices={v for e in boundary for v in e.verts}
rim_clearance=[((v.co.x-(.074 if v.co.x>0 else -.074))/.038)**2+((v.co.y-.04)/.029)**2+((v.co.z+.092)/.037)**2 for v in rim_vertices]
assert min(rim_clearance)>1.01,min(rim_clearance)
bm.free()
for side in [-1,1]:
 bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=8,location=(side*.074,.04,-.092));o=bpy.context.object;o.name='aquatic-seated-sclera';o.scale=(.038,.029,.037);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 for p in o.data.polygons:p.use_smooth=True
 for name,r in [('aquatic-teal-iris',.013),('aquatic-focused-pupil',.005)]:
  v=[];f=[];segments=16 if name.endswith('iris') else 12;rings=2
  for j in range(rings+1):
   for i in range(segments+1):
    rr=r*j/rings;a=math.tau*i/segments;dx=rr*math.cos(a);dy=rr*math.sin(a)-.001
    z=-.092-.037*math.sqrt(max(.01,1-(dx/.038)**2-(dy/.029)**2))-(.0007 if name.endswith('iris') else .0012);v.append((side*.074+dx,.04+dy,z))
    if j<rings and i<segments:n=j*(segments+1)+i;f.append((n,n+1,n+segments+2,n+segments+1))
  mesh(name,v,f)
result=[];stats={}
for o in list(bpy.context.scene.objects):
 if o.type!='MESH' or o.name.startswith('Editable_'):continue
 bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.transform_apply(location=True,rotation=True,scale=True);o.select_set(False);me=o.data
 if any(x in o.name for x in ['iris','pupil','lips']):
  for p in me.polygons:
   if p.normal.z>0:p.flip()
  me.update()
 me.calc_loop_triangles();uv=me.uv_layers.active
 if not uv:
  bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.uv.smart_project(island_margin=.025);bpy.ops.object.mode_set(mode='OBJECT');o.select_set(False);uv=me.uv_layers.active
 col=me.color_attributes.get('COLOR_0');p=[];n=[];u=[];c=[]
 for tri in me.loop_triangles:
  for li in tri.loops:
   ve=me.vertices[me.loops[li].vertex_index];p.extend(ve.co);n.extend(ve.normal);u.extend(uv.data[li].uv)
   if col:c.extend(col.data[ve.index].color[:3])
 assert all(math.isfinite(x) for x in p+n+u+c)
 result.append({'name':o.name,'position':p,'normal':n,'uv':u,'color':c});stats[o.name]=len(p)//9
import sys
sys.path.insert(0,str(root/'scripts/art'))
from aquatic_face_storage import write_packed_face
write_packed_face(result,root/'src/visual/creatures/v2/sea-witch-authored-face.ts')
(out/'aquatic-face-manifest.json').write_text(json.dumps({'parts':stats,'triangles':sum(stats.values()),'intentionalOrbitalBoundaryLoops':eye_loops,'correctedEvaluatedLidVertices':corrected_lid_vertices,'minimumRimEllipsoidRadiusSquared':min(rim_clearance),'front':'Three -Z; editable authoring scene uses Y-up landmark coordinates'},indent=2));bpy.ops.wm.save_as_mainfile(filepath=str(out/'aquatic-face-editable.blend'));print('AUTHORED_AQUATIC_FACE',stats,sum(stats.values()))
