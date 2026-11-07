"""Authored 256px wet-purple albedo/tangent-normal/ORM bake on the real union UVs.
No dramatic lighting is baked into color. AO is restrained and separately packed.
"""
import bpy,pathlib,math,json,struct,zlib,base64,hashlib
root=pathlib.Path.cwd();out=root/'.art/kraken-baked';out.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(root/'.art/kraken-authored/kraken-editable-authoring.blend'))
body=bpy.data.objects['Kraken_Continuous_Authored_Surface']
for ob in bpy.context.scene.objects:ob.hide_render=ob!=body;ob.select_set(False)
body.hide_set(False);body.hide_render=False;body.select_set(True);bpy.context.view_layer.objects.active=body
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=32;scene.cycles.use_denoising=False
scene.render.bake.margin=3;scene.render.bake.use_clear=False;scene.render.bake.use_selected_to_active=False;scene.render.bake.normal_space='TANGENT'
mat=bpy.data.materials.new('Kraken wet-purple authored source');mat.use_nodes=True;mat.use_fake_user=True
body.data.materials.clear();body.data.materials.append(mat)
for poly in body.data.polygons:poly.material_index=0
nodes=mat.node_tree.nodes;nodes.clear();links=mat.node_tree.links
output=nodes.new('ShaderNodeOutputMaterial');bsdf=nodes.new('ShaderNodeBsdfPrincipled');links.new(bsdf.outputs['BSDF'],output.inputs['Surface'])
coords=nodes.new('ShaderNodeTexCoord');mapping=nodes.new('ShaderNodeVectorMath');mapping.operation='MULTIPLY';mapping.inputs[1].default_value=(3.5,3.5,1.0);links.new(coords.outputs['Generated'],mapping.inputs[0])
noise=nodes.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=4.0;noise.inputs['Detail'].default_value=3.4;noise.inputs['Roughness'].default_value=.62;noise.inputs['Distortion'].default_value=.7;links.new(mapping.outputs['Vector'],noise.inputs['Vector'])
pigment=nodes.new('ShaderNodeValToRGB');r=pigment.color_ramp;r.elements.remove(r.elements[1]);r.elements[0].position=.13;r.elements[0].color=(.009,.003,.027,1)
for pos,col in [(.38,(.025,.006,.071,1)),(.62,(.035,.008,.085,1)),(.84,(.065,.016,.14,1))]:r.elements.new(pos).color=col
links.new(noise.outputs['Fac'],pigment.inputs['Fac'])
wave=nodes.new('ShaderNodeTexVoronoi');wave.feature='DISTANCE_TO_EDGE';wave.distance='EUCLIDEAN';wave.inputs['Scale'].default_value=4.0;links.new(mapping.outputs['Vector'],wave.inputs['Vector'])
veins=nodes.new('ShaderNodeValToRGB');r=veins.color_ramp;r.elements[0].position=.014;r.elements[0].color=(.32,.32,.32,1);r.elements[1].position=.065;r.elements[1].color=(0,0,0,1);links.new(wave.outputs['Distance'],veins.inputs['Fac'])
color=nodes.new('ShaderNodeMixRGB');color.blend_type='MIX';links.new(veins.outputs['Color'],color.inputs[0]);links.new(pigment.outputs['Color'],color.inputs[1]);color.inputs[2].default_value=(.10,.028,.19,1);links.new(color.outputs['Color'],bsdf.inputs['Base Color'])
rough=nodes.new('ShaderNodeMapRange');rough.inputs['From Min'].default_value=0;rough.inputs['From Max'].default_value=1;rough.inputs['To Min'].default_value=.42;rough.inputs['To Max'].default_value=.64;links.new(noise.outputs['Fac'],rough.inputs['Value']);links.new(rough.outputs['Result'],bsdf.inputs['Roughness'])
fine=nodes.new('ShaderNodeTexNoise');fine.inputs['Scale'].default_value=85;fine.inputs['Detail'].default_value=2;fine.inputs['Roughness'].default_value=.6;links.new(coords.outputs['Generated'],fine.inputs['Vector'])
height=nodes.new('ShaderNodeMixRGB');height.blend_type='MIX';height.inputs[0].default_value=.22;links.new(veins.outputs['Color'],height.inputs[1]);links.new(fine.outputs['Fac'],height.inputs[2])
bump=nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.23;bump.inputs['Distance'].default_value=.006;links.new(height.outputs['Color'],bump.inputs['Height']);links.new(bump.outputs['Normal'],bsdf.inputs['Normal'])
bsdf.inputs['Coat Weight'].default_value=.05;bsdf.inputs['Coat Roughness'].default_value=.45
emission=nodes.new('ShaderNodeEmission');emission.inputs['Strength'].default_value=1;target=nodes.new('ShaderNodeTexImage');nodes.active=target
N=256
def image(name,base):
 im=bpy.data.images.new(name,width=N,height=N,alpha=True,float_buffer=True);im.colorspace_settings.name='Non-Color';im.pixels=list(base)*(N*N);target.image=im;nodes.active=target;return im
def bake_emit(socket,name,base):
 im=image(name,base);links.new(socket,emission.inputs['Color']);links.new(emission.outputs[0],output.inputs['Surface']);bpy.ops.object.bake(type='EMIT');return im
albedo=bake_emit(color.outputs['Color'],'kraken-linear-albedo',(.07,.012,.14,1))
rough_img=bake_emit(rough.outputs['Result'],'kraken-roughness',(.38,.38,.38,1))
normal=image('kraken-tangent-normal',(.5,.5,1,1));links.new(bsdf.outputs['BSDF'],output.inputs['Surface']);bpy.ops.object.bake(type='NORMAL')
ao=image('kraken-local-occlusion',(1,1,1,1));scene.cycles.samples=64;bpy.ops.object.bake(type='AO')
def srgb(v):return 12.92*v if v<=.0031308 else 1.055*max(v,0)**(1/2.4)-.055
def byte(v):return max(0,min(255,round(v*255)))
rgba={name:bytearray(N*N*4) for name in ['color','normal','orm']};p=list(albedo.pixels);n=list(normal.pixels);r=list(rough_img.pixels);a=list(ao.pixels)
for i in range(N*N):
 q=i*4
 for c in range(3):rgba['color'][q+c]=byte(srgb(p[q+c]));rgba['normal'][q+c]=byte(n[q+c])
 rgba['orm'][q]=byte(.78+.22*a[q]);rgba['orm'][q+1]=byte(r[q]);rgba['orm'][q+2]=0
 for value in rgba.values():value[q+3]=255
def png(path,data):
 def chunk(kind,payload):return struct.pack('>I',len(payload))+kind+payload+struct.pack('>I',zlib.crc32(kind+payload)&0xffffffff)
 rows=b''.join(b'\0'+data[y*N*4:(y+1)*N*4] for y in range(N))
 path.write_bytes(b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',N,N,8,6,0,0,0))+chunk(b'IDAT',zlib.compress(rows,9))+chunk(b'IEND',b''))
for name,data in rgba.items():png(out/f'kraken-{name}.png',data)
# Source and actual baked images remain editable and packed, separate from runtime GLB.
for im in [albedo,rough_img,normal,ao]:im.pack()
bpy.ops.wm.save_as_mainfile(filepath=str(out/'kraken-surface-authoring.blend'))
encoded={name:base64.b64encode(data).decode() for name,data in rgba.items()}
geometry_sha=hashlib.sha256((root/'src/visual/creatures/v2/kraken-authored-geometry.ts').read_bytes()).hexdigest()
text="export const krakenBakeSourceGeometrySHA256='"+geometry_sha+"';\n"+"// Generated by scripts/art/bake-kraken-surface.py; original authored 256px UV bake.\nimport * as THREE from 'three';\nimport { registerSharedCreatureTexture } from './SurfaceDetail';\nconst encoded="+json.dumps(encoded,separators=(',',':'))+";\n"
text+='''type Maps={color:THREE.DataTexture;normal:THREE.DataTexture;orm:THREE.DataTexture};
let cached:Maps|undefined;
export function krakenBakedMaps():Maps {
 if(cached)return cached;
 const make=(key:keyof Maps)=>{const raw=atob(encoded[key]);const bytes=Uint8Array.from(raw,c=>c.charCodeAt(0));const map=new THREE.DataTexture(bytes,256,256,THREE.RGBAFormat);map.name='sea-kraken-authored-'+key;map.colorSpace=key==='color'?THREE.SRGBColorSpace:THREE.NoColorSpace;map.wrapS=map.wrapT=THREE.ClampToEdgeWrapping;map.magFilter=THREE.LinearFilter;map.minFilter=THREE.LinearMipmapLinearFilter;map.generateMipmaps=true;map.flipY=false;map.needsUpdate=true;map.addEventListener('dispose',()=>{if(cached?.[key]===map)cached=undefined;});return registerSharedCreatureTexture(map);};
 cached={color:make('color'),normal:make('normal'),orm:make('orm')};return cached;
}
export function createKrakenBakedMaterial():THREE.MeshPhysicalMaterial {
 const maps=krakenBakedMaps();const material=new THREE.MeshPhysicalMaterial({color:0xffffff,map:maps.color,normalMap:maps.normal,roughnessMap:maps.orm,metalnessMap:maps.orm,aoMap:maps.orm,roughness:1,metalness:0,aoMapIntensity:.6,clearcoat:.05,clearcoatRoughness:.45});material.normalScale.setScalar(.75);material.name='authored-wet-purple-kraken';material.userData.sharedImmutableMaps=true;return material;
}
'''
(root/'src/visual/creatures/v2/kraken-baked-surfaces.ts').write_text(text)
manifest={'sourceGeometryModuleSHA256':geometry_sha,'sourceBlendSHA256':hashlib.sha256((root/'.art/kraken-authored/kraken-editable-authoring.blend').read_bytes()).hexdigest(),'size':N,'rawRGBABytes':sum(len(v) for v in rgba.values()),'mipEstimateBytes':int(sum(len(v) for v in rgba.values())*4/3),'colorSpace':{'color':'sRGB','normal':'linear tangent OpenGL +Y','orm':'linear AO/Roughness/Metalness'},'sourceGeometry':str(root/'.art/kraken-authored/kraken-editable-authoring.blend'),'maps':{name:{'sha256':hashlib.sha256(data).hexdigest(),'uniqueRGBA':len({bytes(data[i:i+4]) for i in range(0,len(data),4)})} for name,data in rgba.items()}}
(out/'kraken-surface-manifest.json').write_text(json.dumps(manifest,indent=2));print('BAKED_AUTHORED_KRAKEN_SURFACE',manifest)
