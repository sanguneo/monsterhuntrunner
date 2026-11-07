"""Authored anatomical skin color/roughness fields for the Frankenstein atlas.
No injury/gore: cool olive torso, slightly warmer casting palms/elbows, restrained dermal grain.
The editable vertex-color field and Cycles material remain in the saved Blender source.
"""
import math

def configure(nodes,links,obj,bs,coord):
    mesh=obj.data
    color=mesh.color_attributes.new(name='anatomical-olive-skin',type='FLOAT_COLOR',domain='CORNER')
    rough=mesh.color_attributes.new(name='anatomical-skin-roughness',type='FLOAT_COLOR',domain='CORNER')
    for loop in mesh.loops:
        q=mesh.vertices[loop.vertex_index].co
        x,y,z=q.x,q.z,-q.y # original authored Three.js coordinates
        hand=max(math.exp(-(((x+.87)/.25)**2+((y-1.125)/.23)**2+((z+.36)/.19)**2)),math.exp(-(((x-.99)/.25)**2+((y-1.735)/.23)**2+((z+.52)/.19)**2)))
        elbow=math.exp(-(((abs(x)-.75)/.14)**2+((y-1.62)/.18)**2))
        broad=.025*math.sin(x*8+y*5)*math.sin(z*9-y*3)
        warmth=.026*hand+.014*elbow
        color.data[loop.index].color=(.175+broad+warmth,.235+broad-.005*hand,.105+broad*.65,1)
        r=.65-.08*hand+.035*elbow
        rough.data[loop.index].color=(r,r,r,1)
    attr=nodes.new('ShaderNodeVertexColor');attr.layer_name=color.name;attr.name='painted-anatomical-color-zones'
    ra=nodes.new('ShaderNodeVertexColor');ra.layer_name=rough.name;ra.name='painted-anatomical-roughness'
    noise=nodes.new('ShaderNodeTexNoise');noise.name='restrained-dermal-grain';noise.inputs['Scale'].default_value=83;noise.inputs['Detail'].default_value=2;links.new(coord.outputs['Generated'],noise.inputs['Vector'])
    bump=nodes.new('ShaderNodeBump');bump.name='fine-skin-relief-not-silhouette';bump.inputs['Distance'].default_value=.003;bump.inputs['Strength'].default_value=.18;links.new(noise.outputs['Fac'],bump.inputs['Height']);links.new(bump.outputs['Normal'],bs.inputs['Normal'])
    links.new(attr.outputs['Color'],bs.inputs['Base Color']);links.new(ra.outputs['Color'],bs.inputs['Roughness'])
    return attr.outputs['Color'],ra.outputs['Color']
