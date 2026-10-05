"""Small, seamless tangent normals. These are height data, not new pigments.

Shared by the offline exporters; no procedural Blender nodes are required in
the browser. Original photographed diffuse / normal textures remain intact.
"""
import bpy, math

def add_surface_detail(material, kind):
    bs=next(node for node in material.node_tree.nodes if node.type=='BSDF_PRINCIPLED')
    if bs.inputs['Normal'].is_linked:
        return
    name='SocialCoach '+kind+' micro normal'
    image=bpy.data.images.get(name)
    if image is None:
        size=128
        def height(x,y):
            x%=size;y%=size
            noise=((x*73856093 ^ y*19349663 ^ 81)&255)/255
            if kind=='woven':
                return .09*math.sin(x*math.tau/8)+.09*math.sin(y*math.tau/8)+.012*noise
            return .025*noise
        pixels=[]
        for y in range(size):
            for x in range(size):
                dx=(height(x+1,y)-height(x-1,y))*.8
                dy=(height(x,y+1)-height(x,y-1))*.8
                length=math.sqrt(dx*dx+dy*dy+1)
                pixels.extend((.5-dx/length*.5,.5-dy/length*.5,.5+.5/length,1))
        image=bpy.data.images.new(name,width=size,height=size,alpha=False)
        image.colorspace_settings.name='Non-Color';image.pixels[:]=pixels;image.pack()
    nodes=material.node_tree.nodes
    tex=nodes.new('ShaderNodeTexImage');tex.image=image;tex.extension='REPEAT'
    coordinates=nodes.new('ShaderNodeTexCoord');mapping=nodes.new('ShaderNodeMapping')
    repeat=6 if kind=='woven' else 12
    mapping.inputs['Scale'].default_value=(repeat,repeat,1)
    material.node_tree.links.new(coordinates.outputs['UV'],mapping.inputs['Vector'])
    material.node_tree.links.new(mapping.outputs['Vector'],tex.inputs['Vector'])
    normal=nodes.new('ShaderNodeNormalMap');normal.inputs['Strength'].default_value=.32 if kind=='woven' else .16
    material.node_tree.links.new(tex.outputs['Color'],normal.inputs['Color'])
    material.node_tree.links.new(normal.outputs['Normal'],bs.inputs['Normal'])
