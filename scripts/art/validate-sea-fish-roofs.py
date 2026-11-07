"""Sample evaluated outer skin against actual runtime eyeball ellipsoids.
This is a finite geometric penetration guard, not exhaustive appearance certification.
"""
import bpy,pathlib,json,math,hashlib
root=pathlib.Path.cwd();out=root/'.art/sea-fish-authored'
text=(root/'src/visual/creatures/v2/sea-authored-fish-geometry.ts').read_text();data=json.loads(text.split('const data=',1)[1].split(';\n',1)[0]);result={}
for name in ['pufferfish','sharkFin']:
 bpy.ops.wm.open_mainfile(filepath=str(out/f'{name}-editable-anatomy.blend'));body=next(o for o in bpy.context.scene.objects if o.type=='MESH' and not o.hide_render);body.data.calc_loop_triangles();minimum=1;count=0;bad=0;worst=None
 for side,socket in zip([-1,1],data[name]['sockets']):
  for tri in body.data.loop_triangles:
   if body.data.polygons[tri.polygon_index].material_index!=0:continue
   vs=[body.matrix_world@body.data.vertices[i].co for i in tri.vertices]
   for i in range(7):
    for j in range(7-i):
     a=i/6;b=j/6;p=vs[0]*a+vs[1]*b+vs[2]*(1-a-b)
     if name=='pufferfish':
      cx,cy,cz=socket[0],-socket[2]-.060,socket[1]+.015;dx,dz=p.x-cx,p.z-cz;angle=side*.24;u=math.cos(angle)*dx+math.sin(angle)*dz;v=-math.sin(angle)*dx+math.cos(angle)*dz;q=(u/.060)**2+(v/.035)**2
      if q>=1 or p.y<cy-.02:continue
      clearance=p.y-(cy+.038*math.sqrt(1-q))
     else:
      cx,cy,cz=socket[0]-side*.040,-socket[2],socket[1];q=((p.y-cy)/.050)**2+((p.z-cz)/.028)**2
      if q>=1 or p.x*side<cx*side-.01:continue
      clearance=p.x*side-(cx*side+.041*math.sqrt(1-q))
     if clearance<minimum:minimum=clearance;worst={'point':list(p),'vertices':[list(v) for v in vs],'socket':socket,'material':body.data.polygons[tri.polygon_index].material_index}
     count+=1;bad+=clearance<-.001
 result[name]={'sampleCount':count,'minimumSkinToGlobeClearance':minimum,'penetrationSamplesBelowMinus1mm':bad,'worst':worst}
result['geometryModuleSHA256']=hashlib.sha256((root/'src/visual/creatures/v2/sea-authored-fish-geometry.ts').read_bytes()).hexdigest();(out/'orbital-clearance-validation.json').write_text(json.dumps(result,indent=2));print('FISH_ORBITAL_DIAGNOSTICS',result)

assert all(result[n]['penetrationSamplesBelowMinus1mm']==0 for n in ['pufferfish','sharkFin']), 'Evaluated skin penetrates actual globe'
