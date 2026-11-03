"""Dependency-free GLB container/accessor/index integrity checks (not Khronos certification)."""
import json, math, struct, sys
from pathlib import Path
root=Path(sys.argv[1] if len(sys.argv)>1 else '.art/final')
files=sorted(root.glob('*.glb'))
assert files, f'No GLBs found in {root}'
report=[]
for path in files:
 data=path.read_bytes();magic,version,total=struct.unpack_from('<III',data)
 assert magic==0x46546c67 and version==2 and total==len(data),path
 chunks={};offset=12
 while offset<len(data):
  length,kind=struct.unpack_from('<II',data,offset);offset+=8
  assert length%4==0 and offset+length<=len(data),path
  chunks[kind]=data[offset:offset+length];offset+=length
 doc=json.loads(chunks[0x4e4f534a]);binary=chunks.get(0x004e4942,b'')
 assert doc['asset']['version']=='2.0' and doc.get('meshes'),path
 for buffer in doc.get('buffers',[]):assert buffer['byteLength']<=len(binary) and 'uri' not in buffer,path
 views=doc.get('bufferViews',[])
 for view in views:assert view.get('byteOffset',0)+view['byteLength']<=len(binary),path
 comp={5120:('b',1),5121:('B',1),5122:('h',2),5123:('H',2),5125:('I',4),5126:('f',4)}
 dims={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT2':4,'MAT3':9,'MAT4':16}
 accessors=doc.get('accessors',[])
 for accessor in accessors:
  assert accessor['count']>0 and accessor['componentType'] in comp,path
  if 'bufferView' not in accessor:continue
  view=views[accessor['bufferView']];fmt,size=comp[accessor['componentType']];n=dims[accessor['type']]
  stride=view.get('byteStride',size*n);start=view.get('byteOffset',0)+accessor.get('byteOffset',0)
  end=start+(accessor['count']-1)*stride+size*n
  assert end<=view.get('byteOffset',0)+view['byteLength'],path
  if fmt=='f':
   for i in range(accessor['count']):assert all(math.isfinite(v) for v in struct.unpack_from('<'+fmt*n,binary,start+i*stride)),path
 triangles=0
 for mesh in doc['meshes']:
  for primitive in mesh['primitives']:
   assert primitive.get('mode',4)==4 and 'POSITION' in primitive['attributes'],path
   p=accessors[primitive['attributes']['POSITION']];count=p['count']
   for semantic, ai in primitive['attributes'].items():
    assert accessors[ai]['count']==count,f'{path}: {semantic} count differs from POSITION'
   if 'NORMAL' in primitive['attributes']:
    normal=accessors[primitive['attributes']['NORMAL']]
    assert normal['type']=='VEC3' and normal['componentType']==5126 and normal['count']==p['count'],path
    view=views[normal['bufferView']];start=view.get('byteOffset',0)+normal.get('byteOffset',0);stride=view.get('byteStride',12)
    for i in range(normal['count']):
     xyz=struct.unpack_from('<fff',binary,start+i*stride)
     assert abs(math.sqrt(sum(v*v for v in xyz))-1)<.001,f'{path}: non-unit NORMAL'
   if 'indices' in primitive:
    a=accessors[primitive['indices']];count=a['count'];v=views[a['bufferView']];fmt,size=comp[a['componentType']]
    start=v.get('byteOffset',0)+a.get('byteOffset',0)
    assert max(struct.unpack_from('<'+fmt*count,binary,start))<p['count'],path
   assert count%3==0,path
   triangles+=count//3
 report.append({'id':path.stem,'bytes':len(data),'uniqueMeshTriangles':triangles})
(root/'glb-validation.json').write_text(json.dumps(report,indent=2))
print(f'PASS: {len(files)} GLB2 containers, buffer ranges, finite accessors, unit normals, triangle modes and index bounds')
