"""Deterministic offline corner-UV atlas pipeline, preserving runtime positions/normals.
blender -b -t 2 --python-exit-code 1 --python scripts/art/unwrap-bake-zombie-lab-skin.py -- DIR [--bake] [--ids=giantZombie] [--size=1024]
Bakes are diagnostic material-depth infrastructure, NOT approved final creature art.
"""
import bpy, sys, json, math, struct, hashlib, base64
from pathlib import Path
from mathutils import Vector
args=sys.argv[sys.argv.index('--')+1:]; root=Path(args[0]).resolve(); root.mkdir(parents=True,exist_ok=True)
ids=next((a.split('=',1)[1].split(',') for a in args if a.startswith('--ids=')),None)
size=int(next((a.split('=',1)[1] for a in args if a.startswith('--size=')),'1024'))
bake='--bake' in args
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=16;scene.cycles.use_denoising=False
manifest={'schema':1,'uvConvention':'runtime u,1-v (Blender -> glTF); DataTexture flipY=false','tangentConvention':'Blender exporter convention: rotated xyz, original bitangent sign','blender':bpy.app.version_string,'coordinateTransform':'(x,y,z) -> (x,-z,y)','unwrap':{'algorithm':'smart_project','angleDegrees':66,'islandMargin':.015,'weldQuantization':1e-6},'assets':{}}
def digest(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def node(nodes,kind,name):n=nodes.new(kind);n.name=name;return n
for source in sorted(root.glob('*.geometry.json')):
 d=json.loads(source.read_text()); name=d['id']
 if ids and name not in ids:continue
 p=d['positions'];normals=d['normals'];count=d['vertexCount'];assert len(p)==len(normals)==count*3
 packed=struct.pack('<%sf'%len(p),*p)+struct.pack('<%sf'%len(normals),*normals)
 assert hashlib.sha256(packed).hexdigest()==d['geometrySha256'],'Source geometry digest mismatch'
 vertices=[];lookup={};indices=[]
 for i in range(count):
  q=(p[i*3],-p[i*3+2],p[i*3+1]);key=tuple(round(v,6) for v in q)
  if key not in lookup:lookup[key]=len(vertices);vertices.append(q)
  indices.append(lookup[key])
 faces=[indices[i:i+3] for i in range(0,count,3)]
 assert all(len(set(f))==3 for f in faces),'Weld would collapse a source triangle; refine tolerance rather than silently dropping faces'
 mesh=bpy.data.meshes.new(name+'-unwrap-skin');mesh.from_pydata(vertices,[],faces);mesh.update()
 obj=bpy.data.objects.new(name+'-uv-bake-source',mesh);bpy.context.collection.objects.link(obj)
 bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
 assert len(mesh.polygons)*3==count
 layer=mesh.attributes.new('source_triangle','INT','FACE')
 for poly in mesh.polygons:poly.use_smooth=True;layer.data[poly.index].value=poly.index
 split=[(normals[i*3],-normals[i*3+2],normals[i*3+1]) for i in range(count)]
 mesh.normals_split_custom_set(split)
 bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT')
 bpy.ops.uv.smart_project(angle_limit=math.radians(66),island_margin=.015,area_weight=0.0,correct_aspect=True,scale_to_bounds=True)
 bpy.ops.object.mode_set(mode='OBJECT')
 layer=mesh.attributes['source_triangle'];assert len(layer.data)==count//3
 corner_map={};ordered_normals=[None]*len(mesh.loops)
 for poly in mesh.polygons:
  tri=layer.data[poly.index].value
  for loop in poly.loop_indices:
   point=mesh.vertices[mesh.loops[loop].vertex_index].co
   candidates=[Vector((p[(tri*3+c)*3],-p[(tri*3+c)*3+2],p[(tri*3+c)*3+1])) for c in range(3)]
   corner=min(range(3),key=lambda c:(point-candidates[c]).length_squared)
   assert (point-candidates[corner]).length<2e-6,'Source corner correspondence lost'
   corner_map[loop]=corner;index=tri*3+corner
   ordered_normals[loop]=(normals[index*3],-normals[index*3+2],normals[index*3+1])
 mesh.normals_split_custom_set(ordered_normals);mesh.calc_tangents(uvmap=mesh.uv_layers.active.name)
 tangents=[None]*(count*4)
 uv=[None]*(count*2);uv_layer=mesh.uv_layers.active;total_area=0;zero_uv=[]
 for poly in mesh.polygons:
  tri=layer.data[poly.index].value;points=[]
  for loop in poly.loop_indices:
   corner=corner_map[loop]
   value=uv_layer.data[loop].uv;uv[tri*6+corner*2:tri*6+corner*2+2]=[float(value.x),1.0-float(value.y)];points.append(value.copy())
   t=mesh.loops[loop].tangent;w=mesh.loops[loop].bitangent_sign
   source_index=tri*3+corner;original_n=Vector(normals[source_index*3:source_index*3+3]);runtime_t=Vector((t.x,t.z,-t.y))
   runtime_t=(runtime_t-original_n*runtime_t.dot(original_n)).normalized()
   assert abs(runtime_t.length-1)<1e-4 and abs(abs(w)-1)<1e-4 and abs(runtime_t.dot(original_n))<1e-6
   tangents[tri*12+corner*4:tri*12+corner*4+4]=[runtime_t.x,runtime_t.y,runtime_t.z,w]
  area=abs((points[1]-points[0]).cross(points[2]-points[0]))*.5;total_area+=area
  if area<1e-14:zero_uv.append(tri)
 assert not zero_uv, f'Collapsed UV triangles: {zero_uv[:8]}'
 assert all(v is not None and math.isfinite(v) and -.0001<=v<=1.0001 for v in uv)
 assert .10<total_area<1.001, f'Invalid packed coverage {total_area}'
 uv_path=root/(name+'.uv.f32');uv_path.write_bytes(struct.pack('<%sf'%len(uv),*uv))
 tangent_path=root/(name+'.tangent.f32');tangent_path.write_bytes(struct.pack('<%sf'%len(tangents),*tangents))
 record={'tangentOrthogonalizedToExactSourceNormal':True,'tangentFile':tangent_path.name,'tangentSha256':digest(tangent_path),'geometrySha256':d['geometrySha256'],'geometryFnv32':d['geometryFnv32'],'vertexCount':count,'triangles':count//3,'weldedVertices':len(vertices),'uvSha256':digest(uv_path),'uvFile':uv_path.name,'uvAreaCoverage':total_area,'maps':{},'status':'unapproved diagnostic atlas; geometry preserved'}
 mat=bpy.data.materials.new(name+'-diagnostic-skin');mat.use_nodes=True;obj.data.materials.append(mat);nodes=mat.node_tree.nodes;links=mat.node_tree.links;nodes.clear()
 output=node(nodes,'ShaderNodeOutputMaterial','output');bs=node(nodes,'ShaderNodeBsdfPrincipled','skin-preview');links.new(bs.outputs['BSDF'],output.inputs['Surface'])
 coord=node(nodes,'ShaderNodeTexCoord','source-space');noise=node(nodes,'ShaderNodeTexNoise','broad-tone');noise.inputs['Scale'].default_value=7;noise.inputs['Detail'].default_value=3;links.new(coord.outputs['Generated'],noise.inputs['Vector'])
 ramp=node(nodes,'ShaderNodeValToRGB','diagnostic-olive-tone');ramp.color_ramp.elements[0].color=(.12,.16,.075,1);ramp.color_ramp.elements[1].color=(.30,.34,.19,1);links.new(noise.outputs['Fac'],ramp.inputs['Fac']);links.new(ramp.outputs['Color'],bs.inputs['Base Color']);bs.inputs['Roughness'].default_value=.68
 fine=node(nodes,'ShaderNodeTexNoise','fine-dermal-grain');fine.inputs['Scale'].default_value=75;fine.inputs['Detail'].default_value=2;links.new(coord.outputs['Generated'],fine.inputs['Vector'])
 bump=node(nodes,'ShaderNodeBump','shallow-grain');bump.inputs['Strength'].default_value=.22;bump.inputs['Distance'].default_value=.008;links.new(fine.outputs['Fac'],bump.inputs['Height']);links.new(bump.outputs['Normal'],bs.inputs['Normal'])
 color_output=ramp.outputs['Color'];rough_output=None
 if '--art=frankenstein' in args or '--art=zombie' in args:
  import importlib.util
  artist_file='zombie-skin-art.py' if '--art=zombie' in args else 'frankenstein-skin-art.py'
  spec=importlib.util.spec_from_file_location('anatomical_skin_art',Path(__file__).with_name(artist_file));artist=importlib.util.module_from_spec(spec);spec.loader.exec_module(artist)
  color_output,rough_output=artist.configure(nodes,links,obj,bs,coord)
  record['status']='authored anatomical skin atlas; visual approval pending'
 target=node(nodes,'ShaderNodeTexImage','active-bake-target');nodes.active=target
 if bake:
  scene.render.bake.margin=max(3,size//128);scene.render.bake.use_clear=False
  for kind in ['basecolor','normal','orm']:
   img=bpy.data.images.new(name+'-'+kind,width=size,height=size,alpha=False,float_buffer=False);img.colorspace_settings.name='sRGB' if kind=='basecolor' else 'Non-Color';target.image=img;nodes.active=target
   background={'basecolor':(.21,.25,.13,1),'normal':(.5,.5,1,1),'orm':(1,.68,0,1)}[kind];img.generated_color=background
   if kind=='normal':
    links.new(bs.outputs['BSDF'],output.inputs['Surface']);scene.render.bake.normal_space='TANGENT';bpy.ops.object.bake(type='NORMAL')
   else:
    emission=node(nodes,'ShaderNodeEmission','bake-emission-'+kind)
    if kind=='basecolor':links.new(color_output,emission.inputs['Color'])
    else:
     combine=node(nodes,'ShaderNodeCombineColor','packed-orm');combine.mode='RGB';combine.inputs[0].default_value=1;combine.inputs[1].default_value=.68;combine.inputs[2].default_value=0
     if rough_output is not None:links.new(rough_output,combine.inputs[1])
     ao=node(nodes,'ShaderNodeAmbientOcclusion','baked-ambient-occlusion');ao.inputs['Distance'].default_value=.35;links.new(ao.outputs['AO'],combine.inputs[0]);links.new(combine.outputs[0],emission.inputs['Color'])
    links.new(emission.outputs[0],output.inputs['Surface']);bpy.ops.object.bake(type='EMIT')
   path=root/(name+'-'+kind+'.png');img.filepath_raw=str(path);img.file_format='PNG';img.save();record['maps'][kind]={'file':path.name,'sha256':digest(path),'size':size,'colorSpace':'sRGB' if kind=='basecolor' else 'linear'}
  links.new(bs.outputs['BSDF'],output.inputs['Surface'])
 manifest['assets'][name]=record
 print('UV_ATLAS_VERIFIED',name,count,total_area,flush=True)
blend=root/'skin-uv-bake-source.blend';bpy.ops.wm.save_as_mainfile(filepath=str(blend));manifest['blendSha256']=digest(blend)
(root/'skin-uv.manifest.json').write_text(json.dumps(manifest,indent=2))
print('SAVED_SHA_LINKED_UV_SOURCE',str(blend),flush=True)
