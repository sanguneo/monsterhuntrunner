"""Compare fresh gameplay-factory exports with reviewed GLBs, tolerating PNG completion order only."""
import hashlib,json,struct,sys
from pathlib import Path

def canonical(path):
 raw=path.read_bytes();length=struct.unpack_from('<I',raw,12)[0];doc=json.loads(raw[20:20+length]);binary=raw[28+length:];views=doc['bufferViews']
 def normalize(x):
  if isinstance(x,list):return [normalize(v) for v in x]
  if isinstance(x,dict):
   result={}
   for key,value in x.items():
    if key=='bufferView':
     view=views[value];start=view.get('byteOffset',0);data=binary[start:start+view['byteLength']]
     result[key]={'sha256':hashlib.sha256(data).hexdigest(),'byteLength':len(data),**{k:v for k,v in view.items() if k not in ['buffer','byteOffset','byteLength']}}
    else:result[key]=normalize(value)
   return result
  return x
 return normalize({k:v for k,v in doc.items() if k not in ['buffers','bufferViews']}),hashlib.sha256(raw).hexdigest()
if __name__=='__main__':
 rows=[]
 assert len(sys.argv)==3, 'Pass reviewed pair and eight-model directories explicitly'
 for fresh,review in [('pair',sys.argv[1]),('others',sys.argv[2])]:
  for p in sorted(Path('.art/sea-skull-runtime-audit',fresh).glob('*.glb')):
   old=Path(review,p.name);a,ash=canonical(p);b,bsh=canonical(old)
   assert a==b, f'{p.name}: gameplay geometry/material/UV/image difference'
   rows.append({'id':p.stem,'reviewedSHA256':bsh,'freshFactorySHA256':ash,'byteIdentical':ash==bsh,'allGeometryUVNormalsMapsMaterialsIdentical':True})
 assert len(rows)==10
 Path('.art/sea-skull-runtime-audit/equivalence.json').write_text(json.dumps({'status':'PASS','scope':'Direct gameplay factory then identical shared static bake; no exporter decoration. PNG byte-buffer order can vary by asynchronous encoding completion; every referenced buffer is compared by exact content hash.','assets':rows},indent=2))
 print('PASS all10 gameplay factory export geometry/UV/normals/materials/map bytes match reviewed GLBs')
