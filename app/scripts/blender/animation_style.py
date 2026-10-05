"""Cohesive adult animation art, applied before exporting the fitted CC0 rig.

The same continuous anatomy, weights and facial targets remain editable. Hair
and brows are solid authored meshes, eyes have a painted iris on the eyeball,
and skin uses broad vertex pigments rather than photographed pores. No network
or user-preference changes occur. All pigment values come from globals.css.
"""
import bmesh, bpy, math
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from pigments import pigments

P= pigments()
MATURE={'chen','aunt','mom','dad','he','qiao'}
REFERENCE={'chen','lin','zhou','player'}
FABRIC={'chen':'charcoal','lin':'charcoal','zhou':'denim','aunt':'wine',
 'mom':'sage','dad':'oat','senior':'white','yue':'sage','kai':'navy',
 'fang':'teal','qiao':'navy','cheng':'oat','he':'charcoal','ning':'terracotta',
 'rui':'denim','player':'navy'}
STYLE='adult-animation-v1'

def smooth(a,b,t):
 t=max(0,min(1,(t-a)/(b-a)));return t*t*(3-2*t)
def blend(a,b,t):return tuple(x*(1-t)+y*t for x,y in zip(a,b))
def material(name,token,rough=.72,vertex=False):
 m=bpy.data.materials.new(name);m.use_nodes=True
 bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*P[token],1)
 bs.inputs['Roughness'].default_value=rough;bs.inputs['Specular IOR Level'].default_value=.28
 if vertex:
  bs.inputs['Base Color'].default_value=(1,1,1,1)
  c=m.node_tree.nodes.new('ShaderNodeVertexColor');c.layer_name='Animation pigment'
  m.node_tree.links.new(c.outputs['Color'],bs.inputs['Base Color'])
 return m
def paint(obj,colors):
 attr=obj.data.color_attributes.new(name='Animation pigment',type='FLOAT_COLOR',domain='POINT')
 for v,c in zip(attr.data,colors):v.color=(*c,1)
 obj.data.color_attributes.active_color=attr
def attach(obj,rig):
 g=obj.vertex_groups.new(name='head');g.add(list(range(len(obj.data.vertices))),1,'REPLACE')
 obj.parent=rig;mod=obj.modifiers.new('Connected head rig','ARMATURE');mod.object=rig
 for face in obj.data.polygons:face.use_smooth=True
def mesh(name,vertices,faces,mat,rig):
 data=bpy.data.meshes.new(name);data.from_pydata(vertices,[],faces);data.update()
 obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj);obj.data.materials.append(mat)
 attach(obj,rig);return obj
def transform_anatomy(rig,eyes,id):
 """A mild head enlargement with a smooth neck transition, for every key.

 The transform also updates the rest skeleton and fitted accessories; scaling
 only a visible head leaves a seam and puts the gaze pivot outside the skull.
 """
 pivot=rig.data.bones['neck_01'].head_local.copy();head=rig.data.bones['head'].head_local.z
 eye_centers=[]
 for sign in (-1,1):
  vs=[v.co for v in eyes.data.vertices if v.co.x*sign>0]
  eye_centers.append(Vector(tuple((min(v[i] for v in vs)+max(v[i] for v in vs))/2 for i in range(3))))
 def deform(co,aperture=False):
  v=co.copy();w=smooth(pivot.z-.035,head-.012,v.z)
  width=(.08 if id=='chen' else .12) if id in REFERENCE else .16 if id in MATURE else .22
  v.x*=1+width*w;v.y=pivot.y+(v.y-pivot.y)*(1+.12*w);v.z=pivot.z+(v.z-pivot.z)*(1+(.065 if id in REFERENCE else .105)*w)
  if aperture:
   for raw in eye_centers:
    e=deform(raw);dx=v.x-e.x;dz=v.z-e.z
    weight=math.exp(-((dx/.032)**4+(dz/.025)**4))*smooth(e.y+.02,e.y-.015,v.y)
    v.x+=dx*.10*weight;v.z+=dz*(.55 if id in REFERENCE else .38)*weight
  return v
 for obj in list(bpy.context.scene.objects):
  if obj.type!='MESH':continue
  keys=obj.data.shape_keys
  if keys:
   for key in keys.key_blocks:
    for vertex in key.data:vertex.co=deform(vertex.co,obj.name=='skin')
   # Blender's raw mesh remains separate from edited Basis coordinates. BMesh
   # triangulation takes its positions from that mesh and otherwise silently
   # restores the old head while eyes/teeth keep the new anatomical transform.
   for vertex,basis in zip(obj.data.vertices,keys.key_blocks[0].data):vertex.co=basis.co
  else:
   for vertex in obj.data.vertices:vertex.co=deform(vertex.co)
  obj.data.update()
 bpy.context.view_layer.objects.active=rig;bpy.ops.object.mode_set(mode='EDIT')
 for bone in rig.data.edit_bones:
  old_head=bone.head.copy();old_tail=bone.tail.copy();bone.head=deform(old_head);bone.tail=deform(old_tail)
 bpy.ops.object.mode_set(mode='OBJECT');bpy.context.view_layer.update()
 return [deform(c) for c in eye_centers]

def skin_pigments(skin,id,centers):
 base=P['filmSkin'] if id in REFERENCE else P['skinMature' if id in MATURE else 'skinWarm'];lip=skin.vertex_groups.get('lips');colors=[]
 eyes_z=sum(c.z for c in centers)/2
 for v in skin.data.vertices:
  co=v.co;c=base
  if co.z>eyes_z-.13:
   # Broad cheek/nose warmth: paint follows geometry through every expression.
   cheek=math.exp(-(((abs(co.x)-.050)/.035)**2+((co.z-(eyes_z-.037))/.025)**2))
   front=smooth(-.03,-.14,co.y);c=blend(c,P['filmSkinShadow'] if id in REFERENCE else P['skinShadow'],cheek*.17*front)
   nose=math.exp(-((co.x/.014)**2+((co.z-(eyes_z-.020))/.028)**2));c=blend(c,P['lip'],nose*.10*front)
   if id in MATURE:
    # A pair of quiet authored brow folds retains age without skin-photo grain.
    fold=sum(math.exp(-((co.z-(eyes_z+z))/.0018)**2) for z in (.055,.067))
    c=blend(c,P['skinShadow'],min(.12,fold*.09)*math.exp(-(co.x/.055)**4)*front)
  weight=next((g.weight for g in v.groups if lip and g.group==lip.index),0)
  if weight:c=blend(c,P['filmLip'] if id in REFERENCE else P['lip'],weight*(.52 if id in REFERENCE else .65))
  colors.append(c)
 skin.data.materials.clear();skin.data.materials.append(material('animation:skin','skin',.78,True));paint(skin,colors)
 if id in REFERENCE:
  from surface_detail import add_surface_detail
  mat=skin.data.materials[0];bs=next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED');bs.inputs['Roughness'].default_value=.64;bs.inputs['Specular IOR Level'].default_value=.32
  add_surface_detail(mat,'skin');next(n for n in mat.node_tree.nodes if n.type=='NORMAL_MAP').inputs['Strength'].default_value=.045
 keys=skin.data.shape_keys.key_blocks;basis=keys[0]
 down=skin.shape_key_add(name='browDown');press=skin.shape_key_add(name='mouthPress')
 mouth=[v.co for v in skin.data.vertices if lip and any(g.group==lip.index for g in v.groups)]
 mouth_z=sum(v.z for v in mouth)/len(mouth)
 for i,co in enumerate(v.co for v in basis.data):
  front=smooth(-.05,-.13,co.y)
  inner=math.exp(-((co.x/.045)**4+((co.z-(eyes_z+.020))/.021)**4))*front
  down.data[i].co.z-=.006*inner
  w=next((g.weight for g in skin.data.vertices[i].groups if lip and g.group==lip.index),0)
  press.data[i].co.z-=(co.z-mouth_z)*.20*w
 down.value=0;press.value=0

def eyeballs(rig,centers,old,id):
 """The iris/pupil belong to one curved eyeball, never floating front discs."""
 vs=[];fs=[];colors=[];segments=64;rings=32
 for c in centers:
  offset=len(vs)
  for j in range(rings+1):
   polar=j*math.pi/rings
   for i in range(segments):
    a=i*math.tau/segments;xx=math.sin(polar)*math.cos(a);zz=math.cos(polar);yy=math.sin(polar)*math.sin(a)
    vs.append((c.x+xx*.0178,c.y+(.003 if id in REFERENCE else 0)+yy*(.0125 if id in REFERENCE else .0143),c.z+zz*(.017 if id in REFERENCE else .016)))
    distance=math.hypot(xx,zz);color=P['sclera']
    if yy<0:
     iris=1-smooth(.43,.49,distance);color=blend(color,P['iris'],iris)
     pupil=1-smooth(.20,.26,distance);color=blend(color,P['dark'],pupil)
     # A quiet warm iris edge rather than photographic veins or a glass lens.
     edge=math.exp(-((distance-.44)/.035)**2);color=blend(color,P['hair'],edge*.40)
    colors.append(color)
  for j in range(rings):
   for i in range(segments):
    a=offset+j*segments+i;b=offset+j*segments+(i+1)%segments
    fs.append((a,a+segments,b+segments,b))
 bpy.data.objects.remove(old,do_unlink=True)
 obj=mesh('eyes',vs,fs,material('animation:eyes','sclera',.36,True),rig);paint(obj,colors)
 if id in REFERENCE:
  bs=next(n for n in obj.data.materials[0].node_tree.nodes if n.type=='BSDF_PRINCIPLED');bs.inputs['Roughness'].default_value=.18;bs.inputs['Specular IOR Level'].default_value=.45;bs.inputs['Coat Weight'].default_value=.24;bs.inputs['Coat Roughness'].default_value=.08
 return obj

def brows(rig,centers,skin,old,id):
 # The front surface is sampled from the actual face so each identity stays fit.
 bvh=BVHTree.FromPolygons([v.co for v in skin.data.vertices],[p.vertices[:] for p in skin.data.polygons])
 vs=[];fs=[]
 for c in centers:
  sign=1 if c.x>0 else -1;offset=len(vs)
  for j in range(25):
   u=j/24;x=c.x+sign*(u-.5)*.040;z=c.z+.026+.0035*math.sin(math.pi*u)-u*.003
   hit=bvh.ray_cast(Vector((x,-.45,z)),Vector((0,1,0)),1)[0];y=hit.y-.0015 if hit else c.y-.019
   thickness=.0038*(.42+.58*math.sin(math.pi*u)**.4)
   for k in range(8):
    a=k*math.tau/8;vs.append((x,y-.0018*math.sin(a),z+thickness*math.cos(a)))
  for j in range(24):
   for k in range(8):
    a=offset+j*8+k;b=offset+j*8+(k+1)%8;face=(a,b,b+8,a+8);fs.append(face if sign>0 else tuple(reversed(face)))
  fs.append(tuple(offset+k for k in reversed(range(8))));fs.append(tuple(offset+24*8+k for k in range(8)))
 bpy.data.objects.remove(old,do_unlink=True)
 obj=mesh('Sculpted brows',vs,fs,material('animation:brows','hairGray' if id in {'dad','he'} else 'hair',.83),rig)
 obj.shape_key_add(name='Basis');up=obj.shape_key_add(name='browInnerUp');down=obj.shape_key_add(name='browDown')
 for v,u,d in zip(obj.data.vertices,up.data,down.data):
  inner=1-smooth(.014,.048,abs(v.co.x));u.co.z+=.007*inner;d.co.z-=.006*inner
 up.value=0;down.value=0

def sculpted_hair(rig,skin,centers,old,id):
 """A fitted opaque scalp, swept lobes, and distinct adult silhouettes.

 Each lock is a closed tapered section. The scalp is ray-fitted to the source
 head and slightly padded. There are no alpha hair cards or individual strands.
 """
 bvh=BVHTree.FromPolygons([v.co for v in skin.data.vertices],[p.vertices[:] for p in skin.data.polygons])
 ez=sum(c.z for c in centers)/2;cy=rig.data.bones['head'].head_local.y+.004
 head_vertices=[v.co for v in skin.data.vertices if v.co.z>ez+.03]
 top=max(v.z for v in head_vertices)+.014
 width=max(abs(v.x) for v in head_vertices)+.005
 feminine=id in {'lin','aunt','mom','yue','fang','cheng','ning'}
 bob=id in {'aunt','fang','ning'};bun=id in {'lin','mom','yue','cheng'}
 older=id in {'chen','dad','he'}
 gray=id in {'dad','he'};hair_color=blend(P['hair'],P['hairGray'],.78) if gray else P['filmHair'] if id in REFERENCE else P['hair']
 def cap(theta,t,extra=0):
  front=max(0,math.cos(theta));back=max(0,-math.cos(theta))
  line=ez+.009+front*.046-back*.047
  if feminine:line=ez-.021+front*.076-back*.055
  if older:line+=.004+.006*abs(math.sin(theta))
  if bob:line-=.024*(1-front)
  line+=.0025*math.sin(theta*3)
  z=line+(top-line)*t;direction=Vector((math.sin(theta),-math.cos(theta),0))
  hit=bvh.ray_cast(Vector((0,cy,z)),direction,.3)[0]
  if hit:radius=math.hypot(hit.x,hit.y-cy)+.0035
  else:radius=width*math.sqrt(max(0,1-((z-(ez+.025))/(top-(ez+.025)))**2))+.003
  # The old fitted wig hides scalp vertices. Ray hits end abruptly near the
  # crown; bridge that missing area with one continuous dome instead of a ridge.
  reference_z=ez+.050;reference=bvh.ray_cast(Vector((0,cy,reference_z)),direction,.3)[0]
  reference_r=math.hypot(reference.x,reference.y-cy)+.0035 if reference else width
  center_z=ez+.015;extent=top-center_z
  dome=reference_r*math.sqrt(max(0,1-((z-center_z)/extent)**2))/math.sqrt(max(.01,1-((reference_z-center_z)/extent)**2))
  transition=smooth(ez+.055,ez+.090,z);radius=radius*(1-transition)+dome*transition
  radius+=.005*math.sin(math.pi*t)+extra
  return Vector((direction.x*radius,cy+direction.y*radius,z))
 vs=[];fs=[];cols=96;rows=28
 for j in range(rows):
  for i in range(cols):vs.append(tuple(cap(i*math.tau/cols,j/rows)))
 vs.append((0,cy,top+.001));tip=len(vs)-1
 for j in range(rows-1):
  for i in range(cols):a=j*cols+i;b=j*cols+(i+1)%cols;fs.append((a,b,b+cols,a+cols))
 for i in range(cols):fs.append(((rows-1)*cols+i,(rows-1)*cols+(i+1)%cols,tip))
 bpy.data.objects.remove(old,do_unlink=True)
 base=mesh('Sculpted hair cap',vs,fs,material('animation:hair','hair',.72,True),rig)
 cap_colors=[]
 for co in vs:
  theta=math.atan2(co[0],-(co[1]-cy));height=co[2]-ez
  temple=math.exp(-((abs(theta)-1.40)/.36)**4)*(1-smooth(.025,.082,height)) if older else 0
  cap_colors.append(blend(hair_color,P['hairGray'],temple*.85))
 paint(base,cap_colors)
 # Add an inward hem so the hairline has volume, even in very close views.
 solid=base.modifiers.new('Hairline thickness','SOLIDIFY');solid.thickness=.003;solid.offset=-1
 bpy.context.view_layer.objects.active=base;modifier_index=len(base.modifiers)-1
 bpy.ops.object.modifier_apply(modifier=base.modifiers[modifier_index].name)
 locks_v=[];locks_f=[];lock_colors=[]
 def lock(points,radius,depth,gray=False):
  offset=len(locks_v);sections=len(points);sides=8
  for j,p in enumerate(points):
   tangent=(points[min(j+1,sections-1)]-points[max(0,j-1)]).normalized()
   normal=Vector((p.x,p.y-cy,.045)).normalized();across=tangent.cross(normal).normalized();out=across.cross(tangent).normalized()
   taper=.10+.90*math.sin(math.pi*j/(sections-1))**.55
   for k in range(sides):
    a=k*math.tau/sides;v=p+across*(math.cos(a)*radius*taper)+out*(math.sin(a)*depth*taper)
    locks_v.append(tuple(v));lock_colors.append(P['hairGray'] if gray else hair_color)
  for j in range(sections-1):
   for k in range(sides):a=offset+j*sides+k;b=offset+j*sides+(k+1)%sides;locks_f.append((a,a+sides,b+sides,b))
  locks_f.append(tuple(offset+k for k in reversed(range(sides))));locks_f.append(tuple(offset+(sections-1)*sides+k for k in range(sides)))
 # A side part with larger swept masses on one side and short temple locks.
 for i in range(13):
  angle=-1.30+i*.21
  points=[]
  for j in range(25):
   t=j/24;wave=.075*math.sin(t*math.tau+i*.71) if id in REFERENCE else 0;theta=angle+.55*math.sin(t*math.pi*.75)+wave;height=.015+.97*math.sin(t*math.pi/2)
   lift=(.009+.003*math.sin(i*1.4))*math.sin(math.pi*t) if id=='zhou' else .006*math.sin(math.pi*t) if id in REFERENCE else .003*math.sin(math.pi*t)
   points.append(cap(theta,height,.0015+lift))
  lock(points,(.009+.003*math.sin(i*.8)) if id in REFERENCE else .008 if feminine else .010,.0045 if id in REFERENCE else .0035,older and (i<2 or i>10))
 for side in [-1,1]:
  for i in range(8):
   theta=side*(1.2+i*.22);points=[cap(theta+.28*j/20,.01+.66*j/20,.001) for j in range(21)]
   lock(points,.0065,.0028,older and i<4)
 if bun:
  center=cap(math.pi,.52)+Vector((0,.027,0));radius=.037 if id=='lin' else .033
  # A solid volume sits against the fitted rear scalp; the swept ridges describe
  # gathered hair rather than an open wire cage or a bun buried inside the head.
  bvs=[];bfs=[];segments=32;rings=16
  for j in range(rings+1):
   angle=j*math.pi/rings
   for k in range(segments):
    a=k*math.tau/segments;bvs.append(tuple(center+Vector((radius*math.sin(angle)*math.cos(a),.030*math.sin(angle)*math.sin(a),radius*math.cos(angle)))))
  for j in range(rings):
   for k in range(segments):a=j*segments+k;b=j*segments+(k+1)%segments;bfs.append((a,a+segments,b+segments,b))
  mesh('Gathered hair bun',bvs,bfs,material('animation:bun','hair',.75),rig)
  for i in range(8):
   a=i*math.tau/8;points=[]
   for j in range(25):
    t=j/24;theta=t*math.pi
    points.append(center+Vector((math.sin(a)*radius*math.sin(theta),.022*math.cos(theta),math.cos(a)*radius*math.sin(theta))))
   lock(points,.010,.007)
 if bob:
  for side in [-1,1]:
   for i in range(7):
    a=side*(.95+i*.25);start=cap(a,.30);end=cap(a,0)
    points=[]
    for j in range(24):
     t=j/23;p=start.lerp(end,t);p.z-=.037*t*t;p.x+=side*.004*math.sin(math.pi*t);points.append(p)
    lock(points,.008,.0038)
 obj=mesh('Swept hair masses',locks_v,locks_f,material('animation:hair-masses','hair',.72,True),rig);paint(obj,lock_colors)
 return base

def clothing(id):
 for obj in list(bpy.context.scene.objects):
  if obj.type!='MESH' or not obj.name.startswith('clothes'):continue
  for i,old in enumerate(list(obj.data.materials)):
   if old.name.startswith('shoes'):
    if id in {'aunt','mom','yue','cheng','ning'}:
     # The source shoe includes a wide sock tube. Under fitted jeans that tube
     # pokes through the calf; retain the shoe and ankle below the trouser hem.
     rig=bpy.data.objects['SocialCoachRig'];cut=max(rig.data.bones['foot_'+s].head_local.z for s in ('l','r'))+.025
     bm=bmesh.new();bm.from_mesh(obj.data);bmesh.ops.delete(bm,geom=[v for v in bm.verts if v.co.z>cut],context='VERTS');bm.to_mesh(obj.data);bm.free()
    obj.data.materials[i]=material('shoes animation','dark',.66);continue
   casual=len(obj.data.materials)>1 and any(m.name.startswith('sc:') for m in obj.data.materials)
   token='filmSuit' if id in {'chen','lin'} else old.name.replace('sc:','').split('.')[0] if old.name.startswith('sc:') else ('denim' if id in {'aunt','mom','yue','cheng','ning'} else 'charcoal') if casual else FABRIC[id]
   new=material('animation:fabric:'+token,token,.86)
   # Preserve fitted white collars / tie boundaries with a deliberately simple
   # 256px color treatment. No photographed textile normals or printed logos.
   textures=[n.image for n in old.node_tree.nodes if n.type=='TEX_IMAGE' and n.image and n.image.colorspace_settings.name!='Non-Color']
   if textures and not old.name.startswith('sc:') and not casual:
    img=textures[0].copy();img.scale(512 if id in REFERENCE else 256,512 if id in REFERENCE else 256);pixels=list(img.pixels[:])
    for index in range(0,len(pixels),4):
     r,g,b=pixels[index:index+3];value=(r+g+b)/3
     light=smooth(.42,.62,value) if id in REFERENCE else smooth(.45,.72,value)
     color=blend(P[token],P['white'],light)
     for c in range(3):pixels[index+c]=color[c]**(1/2.2)
     pixels[index+3]=1
    img.pixels[:]=pixels;img.pack();node=new.node_tree.nodes.new('ShaderNodeTexImage');node.image=img
    new.node_tree.links.new(node.outputs['Color'],new.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
   obj.data.materials[i]=new
   if id in REFERENCE:
    from surface_detail import add_surface_detail
    add_surface_detail(new,'woven');next(n for n in new.node_tree.nodes if n.type=='NORMAL_MAP').inputs['Strength'].default_value=.12

def mouth_interior(teeth):
 old=teeth.data.materials[0];tex=next((n.image for n in old.node_tree.nodes if n.type=='TEX_IMAGE' and n.image),None)
 colors=[P['porcelain'] for v in teeth.data.vertices]
 if tex and teeth.data.uv_layers.active:
  pixels=list(tex.pixels[:]);w,h=tex.size;uv=teeth.data.uv_layers.active
  for loop in teeth.data.loops:
   u,v=uv.data[loop.index].uv;at=(min(h-1,max(0,int(v*h)))*w+min(w-1,max(0,int(u*w))))*4
   r,g,b=pixels[at:at+3];light=smooth(.32,.65,(r+g+b)/3)
   colors[loop.vertex_index]=blend(P['mouth'],P['porcelain'],light)
 teeth.data.materials.clear();teeth.data.materials.append(material('animation:mouth-interior','porcelain',.68,True));paint(teeth,colors)
 teeth.shape_key_add(name='Basis');jaw=teeth.shape_key_add(name='jawOpen')
 zs=[v.co.z for v in teeth.data.vertices];middle=min(zs)+(max(zs)-min(zs))*.52
 for v,key in zip(teeth.data.vertices,jaw.data):
  if v.co.z<middle:key.co.z-=.026;key.co.y+=.006
 jaw.value=0

def apply_animation_style(id):
 rig=bpy.data.objects['SocialCoachRig'];skin=bpy.data.objects['skin'];old_eyes=bpy.data.objects['eyes']
 centers=transform_anatomy(rig,old_eyes,id)
 skin_pigments(skin,id,centers);eyeballs(rig,centers,old_eyes,id)
 brows(rig,centers,skin,bpy.data.objects['eyebrows'],id)
 sculpted_hair(rig,skin,centers,bpy.data.objects['hair'],id);clothing(id)
 mouth_interior(bpy.data.objects['teeth'])
 if id in REFERENCE:
  for mat in bpy.data.materials:
   if mat.name.startswith(('animation:hair','animation:bun')):
    bs=next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED');bs.inputs['Roughness'].default_value=.48;bs.inputs['Specular IOR Level'].default_value=.38
 rig['artStyle']=STYLE;skin['artStyle']=STYLE
 for obj in bpy.context.scene.objects:
  if obj.type=='MESH':
   # Remove obsolete UV/normal textures only from unreferenced data; no shared
   # materials are modified in the live browser when changing rooms.
   for poly in obj.data.polygons:poly.use_smooth=True
 return centers
