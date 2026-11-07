"""Authored non-gory olive skin fields for three zombie anatomies; no photographic decay."""
import math

def configure(nodes,links,obj,bs,coord):
    mesh=obj.data
    color=mesh.color_attributes.new(name='olive-anatomical-paint',type='FLOAT_COLOR',domain='CORNER')
    rough=mesh.color_attributes.new(name='skin-region-roughness',type='FLOAT_COLOR',domain='CORNER')
    for loop in mesh.loops:
        q=mesh.vertices[loop.vertex_index].co;x,y,z=q.x,q.z,-q.y
        broad=.012*math.sin(x*7+y*4)*math.sin(z*10-y*3)
        joint=math.exp(-((abs(x)-.82)/.23)**2)*math.exp(-((y-1.35)/.42)**2)
        color.data[loop.index].color=(.175+broad+.012*joint,.225+broad,.102+broad*.7,1)
        r=.72-.04*joint;rough.data[loop.index].color=(r,r,r,1)
    attr=nodes.new('ShaderNodeVertexColor');attr.layer_name=color.name;attr.name='painted-olive-anatomy'
    ra=nodes.new('ShaderNodeVertexColor');ra.layer_name=rough.name
    noise=nodes.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=69;noise.inputs['Detail'].default_value=2;links.new(coord.outputs['Generated'],noise.inputs['Vector'])
    bump=nodes.new('ShaderNodeBump');bump.inputs['Distance'].default_value=.004;bump.inputs['Strength'].default_value=.18;links.new(noise.outputs['Fac'],bump.inputs['Height']);links.new(bump.outputs['Normal'],bs.inputs['Normal'])
    links.new(attr.outputs['Color'],bs.inputs['Base Color']);links.new(ra.outputs['Color'],bs.inputs['Roughness'])
    return attr.outputs['Color'],ra.outputs['Color']
