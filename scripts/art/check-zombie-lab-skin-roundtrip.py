"""Check actual Blender GLB import correspondence, not just exported accessor validity."""
import bpy,sys,json,struct,math,hashlib
from pathlib import Path
from mathutils import Vector
root=Path(sys.argv[sys.argv.index('--')+1]).resolve();source=json.loads((root/'giantZombie.geometry.json').read_text());manifest=json.loads((root/'skin-uv.manifest.json').read_text());record=manifest['assets']['giantZombie']
p=source['positions'];uvbytes=(root/record['uvFile']).read_bytes();uv=struct.unpack('<%sf'%(len(uvbytes)//4),uvbytes)
path=root/'giantZombie-skin-uv-proof.glb';data=path.read_bytes();length=struct.unpack_from('<I',data,12)[0];gltf=json.loads(data[20:20+length]);primitive=gltf['meshes'][0]['primitives'][0]
assert {'POSITION','NORMAL','TEXCOORD_0','TANGENT'}<=set(primitive['attributes']);assert len(gltf['images'])==3
material=gltf['materials'][primitive['material']];assert material['occlusionTexture']['index']==material['pbrMetallicRoughness']['metallicRoughnessTexture']['index'];assert 'normalTexture' in material
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False);bpy.ops.import_scene.gltf(filepath=str(path))
obj=next(o for o in bpy.context.scene.objects if o.type=='MESH');mesh=obj.data;assert len(mesh.polygons)*3==source['vertexCount']
def key(v):return tuple(round(float(x),6) for x in v)
triangles={}
for tri in range(source['triangles']):
 points=[key((p[(tri*3+c)*3],-p[(tri*3+c)*3+2],p[(tri*3+c)*3+1])) for c in range(3)];k=tuple(sorted(points));assert k not in triangles;triangles[k]=(tri,points)
max_error=0;matched=set()
for poly in mesh.polygons:
 points=[key(obj.matrix_world@mesh.vertices[mesh.loops[loop].vertex_index].co) for loop in poly.loop_indices];tri,original=triangles[tuple(sorted(points))];matched.add(tri)
 for loop,point in zip(poly.loop_indices,points):
  corner=original.index(point);got=mesh.uv_layers.active.data[loop].uv;expected=(uv[tri*6+corner*2],1-uv[tri*6+corner*2+1]);max_error=max(max_error,abs(got.x-expected[0]),abs(got.y-expected[1]))
assert len(matched)==source['triangles'];assert max_error<2e-6,max_error
result={'matchedTriangles':len(matched),'uvRoundtripMaxError':max_error,'normalMapPresent':True,'packedOrmSameTexture':True,'embeddedImages':len(gltf['images']),'glbSha256':hashlib.sha256(data).hexdigest(),'status':'numerical roundtrip proof, not visual quality approval'}
(root/'skin-roundtrip-validation.json').write_text(json.dumps(result,indent=2));print('PASS_ACTUAL_GLB_IMPORT_UV_ROUNDTRIP',result,flush=True)
