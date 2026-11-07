# HISTORICAL rejected row-built face workflow, retained for recovery/provenance.
# Current: author-sea-witch-cc0-study.py + prepare-sea-witch-cc0-runtime.py; validate-witch-cc0-study.py.
"""Original UV-landmark facial pigmentation/roughness. Exact runtime maps, no lighting camouflage."""
import sys
if '--allow-historical-runtime-overwrite' not in sys.argv:
    raise SystemExit('Historical rejected workflow is disabled by default. Use author-sea-witch-cc0-study.py and prepare-sea-witch-cc0-runtime.py. Recovery-only opt-in: --allow-historical-runtime-overwrite (overwrites current runtime data).')
import bpy,pathlib,json,math,struct,zlib,base64,hashlib
root=pathlib.Path.cwd();out=root/'.art/sea-witch-face-baked';out.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(root/'.art/sea-witch-face-authored/aquatic-face-editable.blend'))
obj=bpy.data.objects['aquatic-face-skin'];me=obj.data;me.calc_loop_triangles();uv=me.uv_layers.active.data;col=me.color_attributes['COLOR_0'];N=256
maps={k:bytearray(N*N*4) for k in ['color','orm']};valid=bytearray(N*N)
def clamp(x):return max(0,min(1,x))
def byte(x):return round(clamp(x)*255)
def field(p,c):
 x,y,z=p;front=1 if z<-.07 else 0
 lip=math.exp(-(x/.036)**4-((y+.112)/.009)**4)*front
 dx=(abs(x)-.074)/.034
 lid_y=.04+.0075*math.sqrt(max(0,1-dx*dx))+.14*(abs(x)-.074)
 lid=math.exp(-((y-lid_y)/.0045)**2-(dx/1.04)**8)*front if abs(dx)<1.3 else 0
 base=[a*max(.05,b)**(1/2.2) for a,b in zip([.53,.70,.67],c)]
 pigment=[.30,.37,.415]
 color=[a*(1-.72*lip)+b*.72*lip for a,b in zip(base,pigment)]
 color=[a*(1-.72*lid)+b*.72*lid for a,b in zip(color,[.12,.275,.30])]
 rough=.56-.16*lip-.065*lid
 return color,[1,rough,0]
for tri in me.loop_triangles:
 uvp=[tuple(uv[li].uv) for li in tri.loops];ids=[me.loops[li].vertex_index for li in tri.loops];vp=[tuple(me.vertices[i].co) for i in ids];cp=[tuple(col.data[i].color[:3]) for i in ids]
 ax,ay=uvp[0];bx,by=uvp[1];cx,cy=uvp[2];det=(by-cy)*(ax-cx)+(cx-bx)*(ay-cy)
 if abs(det)<1e-12:continue
 for iy in range(max(0,math.floor(min(v[1] for v in uvp)*N)),min(N,math.ceil(max(v[1] for v in uvp)*N))):
  for ix in range(max(0,math.floor(min(v[0] for v in uvp)*N)),min(N,math.ceil(max(v[0] for v in uvp)*N))):
   u=(ix+.5)/N;v=(iy+.5)/N;a=((by-cy)*(u-cx)+(cx-bx)*(v-cy))/det;b=((cy-ay)*(u-cx)+(ax-cx)*(v-cy))/det;w=[a,b,1-a-b]
   if min(w)<-1e-6:continue
   p=[sum(w[j]*vp[j][k] for j in range(3)) for k in range(3)];c=[sum(w[j]*cp[j][k] for j in range(3)) for k in range(3)]
   color,orm=field(p,c);index=iy*N+ix;valid[index]=1
   for key,values in [('color',color),('orm',orm)]:maps[key][index*4:index*4+4]=bytes([byte(t) for t in values]+[255])
# Three-pixel UV padding prevents neutral-background seams without changing anatomy.
for _ in range(3):
 old=valid[:]
 for y in range(N):
  for x in range(N):
   i=y*N+x
   if old[i]:continue
   candidates=[ny*N+nx for nx,ny in [(x-1,y),(x+1,y),(x,y-1),(x,y+1)] if 0<=nx<N and 0<=ny<N and old[ny*N+nx]]
   if candidates:
    j=candidates[0];valid[i]=1
    for data in maps.values():data[i*4:i*4+4]=data[j*4:j*4+4]
for i in range(N*N):
 if not valid[i]:
  maps['color'][i*4:i*4+4]=bytes([135,179,171,255]);maps['orm'][i*4:i*4+4]=bytes([255,143,0,255])
def png(path,data):
 def chunk(k,p):return struct.pack('>I',len(p))+k+p+struct.pack('>I',zlib.crc32(k+p)&0xffffffff)
 rows=b''.join(b'\0'+data[y*N*4:(y+1)*N*4] for y in range(N));path.write_bytes(b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',N,N,8,6,0,0,0))+chunk(b'IDAT',zlib.compress(rows,9))+chunk(b'IEND',b''))
images={};stats={}
for key,data in maps.items():
 png(out/f'aquatic-face-{key}.png',data);im=bpy.data.images.load(str(out/f'aquatic-face-{key}.png'));im.name='Original aquatic face '+key;im.colorspace_settings.name='sRGB' if key=='color' else 'Non-Color';im.pack();images[key]=im;stats[key]={'rawRGBA256SHA256':hashlib.sha256(data).hexdigest(),'bytes':len(data)}
mat=bpy.data.materials.new('Original UV aquatic lip and eyelid pigments');mat.use_nodes=True;ns=mat.node_tree.nodes;lk=mat.node_tree.links;bs=ns.get('Principled BSDF');color=ns.new('ShaderNodeTexImage');color.image=images['color'];orm=ns.new('ShaderNodeTexImage');orm.image=images['orm'];split=ns.new('ShaderNodeSeparateColor');lk.new(color.outputs['Color'],bs.inputs['Base Color']);lk.new(orm.outputs['Color'],split.inputs['Color']);lk.new(split.outputs['Green'],bs.inputs['Roughness']);# Runtime DataTexture row0 maps to v0; PNG/image-editor row0 is top. Match those exact bytes in editable Blender via V flip.
coords=ns.new('ShaderNodeTexCoord');multiply=ns.new('ShaderNodeVectorMath');multiply.operation='MULTIPLY';multiply.inputs[1].default_value=(1,-1,1);add=ns.new('ShaderNodeVectorMath');add.operation='ADD';add.inputs[1].default_value=(0,1,0);lk.new(coords.outputs['UV'],multiply.inputs[0]);lk.new(multiply.outputs[0],add.inputs[0]);lk.new(add.outputs[0],color.inputs['Vector']);lk.new(add.outputs[0],orm.inputs['Vector'])
obj.data.materials.clear();obj.data.materials.append(mat)
bpy.ops.wm.save_as_mainfile(filepath=str(out/'aquatic-face-surface-authoring.blend'))
sha=hashlib.sha256((root/'src/visual/creatures/v2/sea-witch-authored-face.ts').read_bytes()).hexdigest();encoded={k:base64.b64encode(v).decode() for k,v in maps.items()}
text="// Generated by scripts/art/bake-sea-witch-face.py; original landmark-authored UV pigmentation.\nimport * as THREE from 'three';\nimport {registerSharedCreatureTexture} from './SurfaceDetail';\nexport const aquaticFaceBakeGeometrySHA256='"+sha+"';\nconst encoded="+json.dumps(encoded,separators=(',',':'))+";\n"
text+='''type Maps={color:THREE.DataTexture;orm:THREE.DataTexture};let cached:Maps|undefined;
export function aquaticFaceMaps():Maps {if(cached)return cached;const make=(key:keyof Maps)=>{const bytes=Uint8Array.from(atob(encoded[key]),c=>c.charCodeAt(0));const map=new THREE.DataTexture(bytes,256,256,THREE.RGBAFormat);map.name='aquatic-face-authored-'+key;map.colorSpace=key==='color'?THREE.SRGBColorSpace:THREE.NoColorSpace;map.wrapS=map.wrapT=THREE.ClampToEdgeWrapping;map.magFilter=THREE.LinearFilter;map.minFilter=THREE.LinearMipmapLinearFilter;map.generateMipmaps=true;map.flipY=false;map.needsUpdate=true;map.addEventListener('dispose',()=>{if(cached?.[key]===map)cached=undefined;});return registerSharedCreatureTexture(map);};cached={color:make('color'),orm:make('orm')};return cached;}
export function createAquaticFaceMaterial():THREE.MeshPhysicalMaterial {const maps=aquaticFaceMaps();const m=new THREE.MeshPhysicalMaterial({color:0xffffff,map:maps.color,roughness:1,roughnessMap:maps.orm,metalness:0,metalnessMap:maps.orm,aoMap:maps.orm,side:THREE.FrontSide,specularIntensity:.35});m.name='authored-aquatic-face-pigmentation';return m;}
'''
(root/'src/visual/creatures/v2/sea-witch-face-surfaces.ts').write_text(text);(out/'face-surface-manifest.json').write_text(json.dumps({'sourceGeometrySHA256':sha,'maps':stats,'resolution':N,'method':'Original landmark masks rasterized into exact authored UVs; localized cool lip/upper-lid pigment and roughness, no random noise or normal-map anatomy substitute.'},indent=2));print('AUTHORED_AQUATIC_PIGMENT',stats)
