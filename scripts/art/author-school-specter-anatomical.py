"""Adapt the provenance-preserved CC0 anatomical study to the school specter runtime.
Original code; CC0 core mesh/morph assets documented in THIRD_PARTY_ART_SOURCES.
Teacher geometry and girl garment/hair identity remain separate and unchanged.
"""
import bpy,bmesh,json,math,struct,base64
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
ROOT=Path.cwd(); OUT=ROOT/'.art/school-anatomical-runtime-v1'; OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'.art/school-specter-anatomical-study/anatomical-head-study.blend'))
for o in list(bpy.data.objects):
 if o.type!='MESH':bpy.data.objects.remove(o,do_unlink=True)
# Original study uses x, -sourceZ, sourceY; restore source landmarks then map runtime Y-up/front-Z.
def runtime(p):
 sx=p.x/.32; sy=p.z/.32+6; sz=-p.y/.32
 depth=sz-1.24535
 z=-.105-depth*(.18 if depth>=0 else .14)
 return Vector((sx*.18,2.60+(sy-7.28415)*.23,z))
head=next(o for o in bpy.data.objects if 'head-neck' in o.name)
for o in bpy.data.objects:
 if o.type!='MESH':continue
 for v in o.data.vertices:v.co=runtime(v.co)
 # Axis permutation is reflected; restore outward winding explicitly.
 for p in o.data.polygons:p.flip();p.use_smooth=True
 o.data.update()
head.name='authored-school-face'
# Neck crop is the only opening closed here; retain proper eye/mouth anatomy.
bm=bmesh.new();bm.from_mesh(head.data)
neck=[e for e in bm.edges if e.is_boundary and max(v.co.y for v in e.verts)<2.38]
# Extend the original jagged crop below the existing uniform collar before capping.
for v in set(v for e in neck for v in e.verts):v.co.y=2.27;v.co.x*=.82
if neck:bmesh.ops.holes_fill(bm,edges=neck,sides=0)
bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(head.data);bm.free()
# Protect all visible facial anatomy, selectively reduce rear cranium hidden under flowing hair.
group=head.vertex_groups.new(name='protected-facial-anatomy')
protected=[]
for v in head.data.vertices:
 x,y,z=v.co
 if z<-.035 and 2.36<y<2.70:
  group.add([v.index],1,'REPLACE');protected.append(v.co.copy())
bpy.context.view_layer.objects.active=head
modifier=head.modifiers.new('retain-facial-loops-reduce-covered-scalp','DECIMATE');modifier.ratio=.48
# Standard quadric reduction; extreme protected weighting collapses the unprotected jaw/skull.
bpy.ops.object.modifier_apply(modifier=modifier.name)
for p in head.data.polygons:p.use_smooth=True
head.data.update(); tree=BVHTree.FromPolygons([v.co for v in head.data.vertices],[list(p.vertices) for p in head.data.polygons])
dev=max(tree.find_nearest(p)[3] for p in protected)
assert dev<.0015,('facial reduction exceeds 1.5mm',dev)
# Closed neck remains beneath the uniform collar; no visible ring-cap at the jaw.
colors=head.data.color_attributes.new(name='COLOR_0',type='FLOAT_COLOR',domain='POINT')
for v,c in zip(head.data.vertices,colors.data):
 x,y,z=v.co
 orbit=math.exp(-((abs(x)-.054)/.032)**2-((y-2.60)/.025)**2) if z<-.07 else 0
 lip=math.exp(-(x/.045)**4-((y-2.445)/.014)**2) if z<-.10 else 0
 c.color=(.78-.20*orbit-.10*lip,.72-.22*orbit-.12*lip,.83-.18*orbit-.05*lip,1)
for o in bpy.data.objects:
 if o.type!='MESH' or o==head:continue
 if o.name.startswith('study-eye'):o.name='authored-almond-sclera-'+o.name[-1]
 elif o.name.startswith('iris'):o.name='school-iris-'+o.name[-1]
 elif o.name.startswith('pupil'):o.name='school-pupil-'+o.name[-1]
# Reduce small smooth eye overlays, then validate whole triangle interiors against the actual globe.
for o in list(bpy.data.objects):
 if o.type!='MESH' or not o.name.startswith(('school-iris','school-pupil')):continue
 bpy.context.view_layer.objects.active=o
 mod=o.modifiers.new('small-eye-overlay','DECIMATE');mod.ratio=.4 if 'iris' in o.name else .2
 bpy.ops.object.modifier_apply(modifier=mod.name)
 globe=bpy.data.objects['authored-almond-sclera-'+o.name[-1]]
 under=globe if 'iris' in o.name else bpy.data.objects['school-iris-'+o.name[-1]]
 under_tree=BVHTree.FromPolygons([v.co for v in under.data.vertices],[list(p.vertices) for p in under.data.polygons])
 o.data.calc_loop_triangles();required=0
 for tri in o.data.loop_triangles:
  a,b,c=[o.data.vertices[i].co for i in tri.vertices]
  for q in [a,b,c,(a+b)*.5,(b+c)*.5,(a+c)*.5,(a+b+c)/3,a*.6+b*.2+c*.2,a*.2+b*.6+c*.2,a*.2+b*.2+c*.6]:
   hit=under_tree.ray_cast(Vector((q.x,q.y,-1)),Vector((0,0,1)))[0]
   if hit:required=max(required,q.z-hit.z+.0004)
 assert required<.002,('eye overlay needs redesign',o.name,required)
 for v in o.data.vertices:v.co.z-=required
 for poly in o.data.polygons:
  if poly.normal.z>0:poly.flip()
  poly.use_smooth=True
 o.data.update()
# Subtle surface-attached eyebrows follow real brow anatomy, not detached flat arches.
for side in [-1,1]:
 verts=[];faces=[]
 for i in range(13):
  t=i/12;x=side*(.025+.063*t);y=2.630+.014*t+.003*math.sin(math.pi*t)
  width=.0015+.0028*math.sin(math.pi*t)
  for yy in [y-width,y+width]:
   hit,n,_,_=tree.ray_cast(Vector((x,yy,-1)),Vector((0,0,1)))
   assert hit is not None
   verts.append(hit+Vector((0,0,-.0007)))
  if i:faces.append((2*i-2,2*i,2*i+1,2*i-1))
 mesh=bpy.data.meshes.new('school-brow');mesh.from_pydata(verts,[],faces);mesh.update()
 for p in mesh.polygons:
  if p.normal.z>0:p.flip()
  p.use_smooth=True
 o=bpy.data.objects.new('arched-natural-brow',mesh);bpy.context.collection.objects.link(o)
# Exact Float32 expanded runtime buffers (including original UVs); no mesh differences in the review export.
result=[]
for o in bpy.data.objects:
 if o.type!='MESH':continue
 m=o.data;m.calc_loop_triangles();uv=m.uv_layers.active;colors=m.color_attributes.get('COLOR_0');p=[];n=[];u=[];c=[]
 for tri in m.loop_triangles:
  if tri.area<1e-12:continue
  for li in tri.loops:
   loop=m.loops[li];v=m.vertices[loop.vertex_index];p.extend(v.co);n.extend(v.normal);u.extend(uv.data[li].uv if uv else (v.co.x,v.co.y))
   if colors:c.extend(colors.data[v.index].color[:3])
 result.append(dict(name=o.name,position=p,normal=n,uv=u,color=c))
values=[];metadata=[]
for part in result:
 item={'name':part['name']}
 for field in ['position','normal','uv','color']:item[field]=[len(values),len(part[field])];values.extend(part[field])
 metadata.append(item)
payload={'data':base64.b64encode(struct.pack('<'+'f'*len(values),*values)).decode(),'parts':metadata}
(OUT/'float32-pack-input.json').write_text(json.dumps(result,separators=(',',':')))
(OUT/'schoolGirlFace.ts').write_text('// CC0-derived anatomical mesh; exact source/provenance in docs/THIRD_PARTY_ART_SOURCES.md.\nimport { decodeAuthoredMeshes } from \'../DecodedAuthoredMesh\';\nexport const authoredSchoolFace = decodeAuthoredMeshes('+json.dumps(payload,separators=(',',':'))+');\n')
budget={r['name']:len(r['position'])//9 for r in result}
(OUT/'mesh-budget.json').write_text(json.dumps({'parts':budget,'total':sum(budget.values()),'protectedProbeCount':len(protected),'protectedMaxDeviation':dev},indent=2))
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'school-specter-anatomical.blend'),compress=True)
print('SAVED_ISOLATED_RUNTIME_CANDIDATE',budget,'TOTAL',sum(budget.values()))
