"""Author five coherent environments and reusable props in Blender.
World anchors deliberately match spaces.ts so old saved rooms remain valid.
Pigments are read from globals.css; photographs are the attributed CC0 sources.
"""
import argparse,bpy,json,math,pathlib,re,sys
from mathutils import Vector
argv=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
p=argparse.ArgumentParser();p.add_argument('--asset-root',required=True);p.add_argument('--out',required=True);p.add_argument('--css',required=True);p.add_argument('--only',default='work,family,school,elevator,office,props');args=p.parse_args(argv)
ROOT=pathlib.Path(args.asset_root);OUT=pathlib.Path(args.out);OUT.mkdir(parents=True,exist_ok=True)
CSS=pathlib.Path(args.css).read_text();PIGMENTS={}
for name,L,C,H in re.findall(r'--dinner-scene-(\w+): oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)',CSS):
 L,C,H=float(L),float(C),float(H)*math.pi/180;a=C*math.cos(H);b=C*math.sin(H)
 l=(L+.3963377774*a+.2158037573*b)**3;m=(L-.1055613458*a-.0638541728*b)**3;s=(L-.0894841775*a-1.291485548*b)**3
 PIGMENTS[name]=tuple(max(0,min(1,v)) for v in (4.0767416621*l-3.3077115913*m+.2309699292*s,-1.2684380046*l+2.6097574011*m-.3413193965*s,-.0041960863*l-.7034186147*m+1.707614701*s))
MAT={}
def reset():
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False);MAT.clear()
 for coll in (bpy.data.materials,bpy.data.meshes):
  for item in list(coll):
   if item.users==0:coll.remove(item)
def xyz(v):return(v[0],-v[2],v[1])
def material(pigment,rough=.65,metal=0,photo=None,emission=0):
 key=(pigment,rough,metal,photo,emission)
 if key in MAT:return MAT[key]
 name=('sc:'+pigment) if not photo else photo
 mat=bpy.data.materials.new(name);mat.use_nodes=True;mat.diffuse_color=(*PIGMENTS[pigment],1)
 bs=next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED');bs.inputs['Base Color'].default_value=(*PIGMENTS[pigment],1);bs.inputs['Roughness'].default_value=rough;bs.inputs['Metallic'].default_value=metal
 if emission:bs.inputs['Emission Color'].default_value=(*PIGMENTS[pigment],1);bs.inputs['Emission Strength'].default_value=emission
 if photo:
  bs.inputs['Base Color'].default_value=(1,1,1,1)
  for suffix,out,input in [('diff','Color','Base Color'),('nor_gl','Color','Normal'),('rough','Color','Roughness')]:
   fn=ROOT/'textures'/(photo+'_'+suffix+'.jpg');img=bpy.data.images.load(str(fn),check_existing=True)
   if suffix!='diff':
    img.colorspace_settings.name='Non-Color'
    if max(img.size)>512:
     img.scale(512,512);cached=ROOT/'texture-cache';cached.mkdir(exist_ok=True);img.file_format='JPEG';img.filepath_raw=str(cached/(photo+'_'+suffix+'512.jpg'));img.save()
   tex=mat.node_tree.nodes.new('ShaderNodeTexImage');tex.image=img
   if suffix=='nor_gl':
    normal=mat.node_tree.nodes.new('ShaderNodeNormalMap');normal.inputs['Strength'].default_value=.3;mat.node_tree.links.new(tex.outputs[out],normal.inputs['Color']);mat.node_tree.links.new(normal.outputs['Normal'],bs.inputs[input])
   else:mat.node_tree.links.new(tex.outputs[out],bs.inputs[input])
 MAT[key]=mat;return mat
def finish(obj,name,mat,bevel=0):
 obj.name=name;obj.data.materials.append(mat)
 if bevel:
  mod=obj.modifiers.new('Soft manufactured edges','BEVEL');mod.width=bevel;mod.segments=3;bpy.context.view_layer.objects.active=obj;bpy.ops.object.modifier_apply(modifier=mod.name)
  norm=obj.modifiers.new('Weighted surface normals','WEIGHTED_NORMAL');norm.keep_sharp=True;bpy.ops.object.modifier_apply(modifier=norm.name)
 for poly in obj.data.polygons:poly.use_smooth=True
 return obj
def box(name,at,size,pigment,bevel=.025,rotation=0,photo=None,rough=.7,metal=0,emission=0):
 bpy.ops.mesh.primitive_cube_add(size=1,location=xyz(at));o=bpy.context.object;o.scale=(size[0],size[2],size[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 # Metric-density planar UVs on all six faces, rather than a stretched cube map.
 uv=o.data.uv_layers.active
 for face in o.data.polygons:
  axis=max(range(3),key=lambda i:abs(face.normal[i]));a,b=[i for i in range(3) if i!=axis]
  for index in face.loop_indices:
   v=o.data.vertices[o.data.loops[index].vertex_index].co;uv.data[index].uv=(v[a]/2.6,v[b]/2.6)
 o.rotation_euler.z=rotation;return finish(o,name,material(pigment,rough,metal,photo,emission),min(bevel,min(size)*.35))
def cylinder(name,at,r,depth,pigment,rough=.65,metal=0,top=None,photo=None,vertices=48):
 bpy.ops.mesh.primitive_cone_add(vertices=vertices,radius1=r,radius2=r if top is None else top,depth=depth,location=xyz(at));o=bpy.context.object
 return finish(o,name,material(pigment,rough,metal,photo),min(.014,depth*.14))
def sphere(name,at,scale,pigment,rough=.55):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=20,ring_count=12,location=xyz(at));o=bpy.context.object;o.scale=(scale[0],scale[2],scale[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);return finish(o,name,material(pigment,rough))
def curve(name,points,r,pigment,metal=0):
 data=bpy.data.curves.new(name,'CURVE');data.dimensions='3D';data.resolution_u=12;data.bevel_depth=r;data.bevel_resolution=3
 spline=data.splines.new('BEZIER');spline.bezier_points.add(len(points)-1)
 for bp,v in zip(spline.bezier_points,points):bp.co=xyz(v);bp.handle_left_type='AUTO';bp.handle_right_type='AUTO'
 o=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(o);o.data.materials.append(material(pigment,.45,metal));return o
def lathe(name,at,profile,pigment,rough=.35,metal=0):
 segments=48;verts=[];faces=[]
 for radius,height in profile:
  for i in range(segments):a=i*math.tau/segments;verts.append(xyz((at[0]+radius*math.cos(a),at[1]+height,at[2]+radius*math.sin(a))))
 for j in range(len(profile)-1):
  for i in range(segments):faces.append((j*segments+i,j*segments+(i+1)%segments,(j+1)*segments+(i+1)%segments,(j+1)*segments+i))
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);finish(o,name,material(pigment,rough,metal));return o
def plate(at,r=.35,pigment='porcelain'):
 return lathe('Glazed plate',at,[(0,0),(.08,0),(.09,.02),(r*.7,.034),(r,.078),(r,.09),(r*.95,.097),(r*.68,.052),(0,.04)],pigment)
def bowl(at,r=.23):return lathe('Ceramic bowl',at,[(.08,0),(.1,.014),(.12,.05),(r,.17),(r,.19),(r-.014,.195),(.11,.07),(.065,.034),(0,.034)],'ceramic')
def chair(at,heading,kind):
 before=set(bpy.context.scene.objects);wood=kind!='school' and kind!='office';seat='chair' if kind=='work' else 'oat' if kind=='family' else 'terracotta' if kind=='school' else 'charcoal'
 box('Seat cushion',(0,.99,0),(1.0,.17,.92),seat,.065,rough=.91)
 box('Curved upholstered back',(0,1.52,-.40),(.95,1.0,.14),seat,.055,rough=.91)
 if wood:
  box('Back frame',(0,1.49,-.47),(1.03,1.13,.11),'woodEdge',.04,photo='wood_table_001')
  for x in [-.52,.52]:
   box('Armrest',(x,1.28,.04),(.09,.09,.68),'wood',.03,photo='wood_table_001');box('Arm support',(x,1.11,.20),(.06,.36,.06),'woodEdge',.018)
 for x in [-.39,.39]:
  for z in [-.31,.31]:
   cylinder('Tapered chair leg',(x,.47,z),.036,.93,'woodEdge' if wood else 'steelSeam',metal=0 if wood else .65,top=.055,vertices=12)
 if kind=='office':
  cylinder('Chair cylinder',(0,.43,0),.07,.85,'steel',metal=.8)
  for i in range(5):
   a=i*math.tau/5;curve('Chair star',[(0,.17,0),(.4*math.sin(a),.15,.4*math.cos(a)),(.57*math.sin(a),.10,.57*math.cos(a))],.035,'steelSeam',.7);sphere('Caster',(.57*math.sin(a),.08,.57*math.cos(a)),(.09,.07,.08),'dark')
 after=set(bpy.context.scene.objects)-before
 root=bpy.data.objects.new('Chair anchor',None);bpy.context.collection.objects.link(root);root.location=xyz(at);root.rotation_euler.z=heading
 for o in after:o.parent=root
 return root
def plant(at):
 cylinder('Stoneware planter',(at[0],.35,at[2]),.30,.7,'ceramic',top=.38);cylinder('Soil',(at[0],.701,at[2]),.34,.02,'woodEdge')
 for i in range(8):
  a=i*2.399;dx=math.sin(a);dz=math.cos(a);h=1.65+(i%3)*.23
  curve('Plant stalk',[(at[0],.6,at[2]),(at[0]+dx*.14,h*.65,at[2]+dz*.14),(at[0]+dx*.34,h,at[2]+dz*.34)],.012,'stem')
  for t in [.62,.82,1]:
   leaf=sphere('Broad leaf',(at[0]+dx*(.12+t*.25),h*t,at[2]+dz*(.12+t*.25)),(.13,.28,.022),'leaf');leaf.rotation_euler.z=-a+.3

def curtain(x,z,width=1.0,height=3.7):
 verts=[];faces=[];columns=48;rows=8
 for j in range(rows+1):
  for i in range(columns+1):
   px=x-width/2+width*i/columns;py=1.1+height*j/rows;pz=z+.09*math.sin(i/columns*math.tau*5)
   verts.append(xyz((px,py,pz)))
 for j in range(rows):
  for i in range(columns):n=j*(columns+1)+i;faces.append((n,n+1,n+columns+2,n+columns+1))
 mesh=bpy.data.meshes.new('Curtain folds');mesh.from_pydata(verts,[],faces);o=bpy.data.objects.new('Woven curtain',mesh);bpy.context.collection.objects.link(o);finish(o,o.name,material('napkin',.95))
def shell(kind):
 wall='wall' if kind=='work' else 'oat' if kind=='family' else 'officeWall';floor='floor' if kind in ('work','family') else 'officeFloor'
 box('Floor',(0,-.06,.5),(13.2,.12,14),floor,.015,photo='wood_floor_deck' if kind=='family' else None,rough=.83)
 box('Back wall',(0,2.85,-5.25),(13.2,5.7,.16),wall,.02)
 for x in [-6.6,6.6]:box('Side wall',(x,2.85,.5),(.16,5.7,11.5),wall,.02)
 box('Ceiling',(0,5.72,.5),(13.2,.10,11.5),'white',.01)
 box('Back skirting',(0,.12,-5.11),(13.0,.24,.08),'woodEdge',.02)
 for x in [-6.48,6.48]:box('Side skirting',(x,.12,.5),(.08,.24,11.3),'woodEdge',.02)
 if kind!='family':
  for x in range(-6,7):box('Tile joint',(x,.004,.5),(.007,.006,13.4),'floorJoint',.002)
  for z in range(-5,8):box('Tile joint',(0,.004,z),(13,.006,.007),'floorJoint',.002)

def table(kind):
 photo='wood_table_001' if kind in ('work','family') else None
 cylinder('Table pedestal',(0,.80,0),.65,1.55,'woodEdge',top=.46,photo=photo)
 cylinder('Round tabletop',(0,1.60,0),2.65,.20,'wood' if kind!='school' else 'oat',photo=photo,rough=.4)
 cylinder('Table edge',(0,1.49,0),2.655,.025,'brass' if kind=='work' else 'woodEdge',metal=.4 if kind=='work' else 0)
 cylinder('Lazy susan',(0,1.736,0),1.54,.035,'ceramic' if kind=='family' else 'porcelain',rough=.22)
 seats=[(0,-3.05,0),(-2.65,-1.55,1.04),(2.65,-1.55,-1.04),(0,3.55,math.pi)]
 for x,z,a in seats:
  chair((x,0,z),a,kind);r=math.hypot(x,z);sx=x/r*2.14;sz=z/r*2.14
  plate((sx,1.70,sz));bowl((sx,1.745,sz),.19)
  cx=sx-.38*math.cos(a);cz=sz+.38*math.sin(a)
  box('Folded linen',(cx,1.73,cz),(.23,.035,.43),'napkin',.015,rotation=a,rough=.98)
  for side in [-.04,.04]:
   # Chopsticks have a tapered profile, real gaps and a ceramic rest.
   o=cylinder('Wood chopstick',(cx+side*math.cos(a),1.762,cz),.009,.58,'woodEdge',top=.005,vertices=10);o.rotation_euler=(math.pi/2,0,a)
  box('Chopstick rest',(cx,1.745,cz-.15),(.15,.035,.04),'ceramic',.012,rotation=a)
 before_meals=set(bpy.context.scene.objects)
 for x,z,food in [(-.78,-.72,'fish'),(.74,-.78,'greens'),(1.07,.28,'meat'),(.05,1.10,'tomato'),(-.93,.39,'dumplings')]:
  plate((x,1.772,z),.43)
  for i in range(8):
   a=i*2.399;radius=math.sqrt(i/9)*.26;px=x+math.cos(a)*radius;pz=z+math.sin(a)*radius
   if food=='greens':
    leaf=sphere('Stir-fried greens',(px,1.86+(i%3)*.025,pz),(.13,.023,.045),'green');leaf.rotation_euler.z=a
   elif food=='dumplings':
    dumpling=sphere('Pleated dumpling',(px,1.865,pz),(.10,.051,.065),'rice');dumpling.rotation_euler.z=a
    for j in [-1,0,1]:curve('Dumpling seam',[(px+j*.025-.012,1.888,pz-.03),(px+j*.025,1.918,pz),(px+j*.025+.012,1.888,pz+.03)],.003,'porcelain')
   elif food=='tomato':sphere('Tomato wedge',(px,1.86,pz),(.09,.035,.06),'red');sphere('Egg curd',(px+.055,1.89,pz+.025),(.055,.035,.045),'rice')
   elif food=='meat':box('Braised meat',(px,1.86,pz),(.12,.075,.10),'food',.025,rotation=a);box('Glaze',(px,1.902,pz),(.1,.015,.085),'tea',.007,rotation=a,rough=.24)
  if food=='fish':
   sphere('Steamed fish',(x,1.886,z),(.32,.065,.12),'food');sphere('Fish head',(x-.27,1.886,z),(.12,.065,.10),'food');sphere('Fish eye',(x-.33,1.926,z+.048),(.010,.007,.008),'dark')
   for i in range(6):box('Ginger and scallion',(x-.16+i*.055,1.941,z),(.018,.010,.13),'green' if i%2 else 'rice',.004,rotation=.4)
 # Plate feet contact the lazy susan rather than floating above it.
 for obj in set(bpy.context.scene.objects)-before_meals:obj.location.z-=.018
 teapot=(-1.5,1.73,-.92);sphere('Teapot body',(teapot[0],teapot[1]+.13,teapot[2]),(.20,.15,.19),'ceramic');cylinder('Teapot lid',(teapot[0],teapot[1]+.278,teapot[2]),.135,.022,'ceramic');sphere('Lid knob',(teapot[0],teapot[1]+.308,teapot[2]),(.035,.026,.035),'brass')
 curve('Teapot handle',[(-1.69,1.80,-.92),(-1.80,1.94,-.92),(-1.68,2.02,-.92)],.025,'ceramic');curve('Teapot spout',[(-1.36,1.82,-.92),(-1.20,1.95,-.92),(-1.19,2.03,-.92)],.035,'ceramic')
 if kind=='work':
  lathe('Green bottle',(1.65,1.70,-.9),[(.11,0),(.11,.36),(.057,.43),(.037,.59),(.037,.61)],'bottle',.2);cylinder('Bottle cap',(1.65,2.33,-.9),.042,.04,'brass',metal=.5)

def dining(kind):
 shell(kind);table(kind);plant((-4.75,0,-3.45))
 box('Sideboard',(4.85,.8,-3.8),(1.3,1.55,.70),'woodEdge',.035,photo='wood_table_001')
 box('Sideboard top',(4.85,1.61,-3.8),(1.4,.07,.80),'wood',.02,photo='wood_table_001')
 for x in [4.55,5.15]:box('Sideboard door',(x,.80,-3.435),(.55,1.35,.02),'wood',.02,photo='wood_table_001');box('Cabinet handle',(x,.99,-3.412),(.15,.025,.025),'brass',.008,metal=.7)
 if kind=='work':
  box('Walnut wainscot',(0,1.0,-5.11),(13.0,2.0,.10),'woodEdge',.015,photo='wood_table_001')
  for i in range(32):box('Reeded wall strip',(-6.18+i*.40,1.0,-5.025),(.03,1.85,.024),'wood',.008)
  box('Brass rail',(0,2.04,-5.01),(13.0,.035,.028),'brass',.008,metal=.7)
  box('Artwork frame',(0,3.55,-5.06),(4.12,2.05,.10),'woodEdge',.012);box('Artwork mount',(0,3.55,-4.994),(3.94,1.87,.025),'porcelain',.005)
  for x in [-3.1,3.1]:
   cylinder('Sconce',(x,3.4,-4.96),.14,.64,'porcelain',rough=.85);box('Sconce bracket',(x,3.4,-5.06),(.08,.75,.04),'brass',.008,metal=.7)
  lathe('Pendant shade',(0,5.05,0),[(.96,0),(.94,.02),(.66,.44),(.64,.45)],'napkin',.88);cylinder('Pendant diffuser',(0,5.052,0),.91,.016,'light',rough=.5);cylinder('Pendant stem',(0,5.51,0),.018,.64,'brass',metal=.5,vertices=12)
 elif kind=='family':
  box('Window',(0,3.0,-5.09),(4.6,3.0,.03),'window',.006,rough=.2)
  for x in [-2.35,0,2.35]:box('Window frame',(x,3,-5.04),(.085,3.13,.06),'white',.015)
  box('Window sill',(0,1.43,-4.92),(4.95,.09,.35),'white',.02);curtain(-2.5,-4.85);curtain(2.5,-4.85)
  for x,y in [(3.6,3.45),(4.7,3.65),(4.0,2.7)]:box('Family photo frame',(x,y,-5.08),(.82,.70,.05),'woodEdge',.012);box('Family photo mount',(x,y,-5.045),(.72,.60,.018),'napkin',.005)
  lathe('Home pendant',(0,5.05,0),[(.67,0),(.65,.03),(.32,.44),(.20,.5)],'porcelain',.5);cylinder('Pendant wire',(0,5.62,0),.015,.64,'dark',vertices=10)
 else:
  for x in [-3.5,3.5]:
   box('Campus window',(x,3.4,-5.09),(3.6,2.1,.035),'window',.006,rough=.2)
   for xx in [x-1.85,x,x+1.85]:box('Window mullion',(xx,3.4,-5.03),(.07,2.23,.05),'white',.01)
   box('Notice board',(x,1.65,-5.03),(2.3,.70,.045),'sage',.025)
  for x in [-3,0,3]:box('Canteen pendant',(x,5.1,0),(1.6,.12,.72),'white',.035);box('Diffuser',(x,5.028,0),(1.5,.018,.62),'light',.008,emission=.5)
  box('Backpack',(4.85,1.85,-3.8),(.49,.53,.30),'navy',.08);box('Backpack pocket',(4.85,1.78,-3.628),(.37,.25,.04),'sage',.026)

def elevator():
 # The lobby and cabin share a real threshold; moving doors are separate nodes.
 shell('elevator')
 box('Lift cabin back',(0,2.4,-4.8),(4.2,4.8,.15),'steel',.012,metal=.65,rough=.38)
 for side in [-1,1]:
  box('Cabin side',(side*2.1,2.4,-3.55),(.15,4.8,2.5),'steel',.012,metal=.65,rough=.38)
  box('Lobby facing',(side*4.05,2.6,-2.34),(4.45,5.2,.20),'officeWall',.015)
  box('Lift jamb',(side*1.82,2.2,-2.12),(.15,4.42,.25),'steelSeam',.018,metal=.8)
  curve('Cabin handrail',[(side*1.94,1.65,-2.7),(side*1.94,1.65,-4.3)],.035,'steel',.75)
 box('Lift lintel',(0,4.46,-2.21),(3.77,.28,.23),'steelSeam',.015,metal=.6)
 for side,name in [(-1,'LiftDoorLeft'),(1,'LiftDoorRight')]:
  door=box(name,(side*.875,2.15,-2.22),(1.74,4.3,.10),'steel',.025,metal=.70,rough=.33);door['dynamic']=True
 box('Lift threshold',(0,.018,-2.18),(3.66,.035,.22),'steel',.006,metal=.8)
 box('Lift indicator',(0,4.72,-2.1),(1.4,.4,.03),'screen',.009)
 box('Lobby direction plate',(-3.76,3.55,-2.21),(2.1,1.0,.04),'white',.012)
 for x,z,h in [(2.5,-2.04,0),(1.94,-3.5,-math.pi/2)]:
  panel=box('Lift panel',(x,2.13,z),(.46,.95,.07),'steelSeam',.025,rotation=h,metal=.65)
  for i,name in enumerate(['LiftOpen','LiftClosed']):
   button=box(name if h==0 else name+'Inner',(x,2.32-i*.42,z+.05),(.22,.20,.035),'marker',.03,rotation=h);button['dynamic']=True
 box('Lobby bench',(-4.8,.85,3.6),(1.65,.18,.75),'wood',.04,photo='wood_table_001')
 for x in [-5.4,-4.2]:box('Bench frame',(x,.42,3.6),(.09,.84,.65),'steelSeam',.015,metal=.7)
 for x in [-3.7,0,3.7]:box('Ceiling light',(x,5.56,.5),(1.5,.06,5.1),'white',.012,emission=.35)

def desk(at,heading):
 before=set(bpy.context.scene.objects)
 box('Desk top',(0,1.68,0),(2.8,.13,1.2),'oat',.025)
 for x in [-1.23,1.23]:
  box('Desk steel frame',(x,.83,0),(.07,1.65,.93),'steelSeam',.015,metal=.65);box('Desk foot',(x,.07,0),(.27,.07,1.05),'steelSeam',.018,metal=.65)
 box('Desk modesty panel',(0,1.10,-.44),(2.42,.72,.035),'oat',.012)
 box('Monitor foot',(.35,1.776,-.30),(.43,.026,.26),'steelSeam',.018,metal=.65)
 box('Monitor stem',(.35,1.93,-.38),(.065,.31,.045),'steelSeam',.012,metal=.65)
 box('Monitor bezel',(.35,2.10,-.38),(1.02,.60,.055),'charcoal',.018)
 box('Monitor display',(.35,2.10,-.346),(.94,.51,.005),'screen',.002)
 box('Keyboard',(.24,1.768,.19),(.83,.030,.27),'steelSeam',.008)
 for j in range(4):
  for i in range(12):box('Keyboard key',(-.12+i*.065,1.790,.08+j*.05),(.049,.01,.035),'charcoal',.003)
 box('Mouse pad',(.95,1.76,.25),(.30,.015,.40),'charcoal',.008);sphere('Mouse',(.95,1.795,.24),(.08,.037,.115),'steelSeam')
 doc=box('EvidenceDocument',(-.85,1.769,.18),(.58,.022,.48),'white',.008);doc['dynamic']=True
 for j in range(5):box('Document line',(-.85,1.783,.02+j*.055),(.42,.003,.006),'floorJoint',.001)
 box('Pen',(-.4,1.778,.30),(.22,.012,.025),'marker',.006)
 after=set(bpy.context.scene.objects)-before;root=bpy.data.objects.new('Desk anchor',None);bpy.context.collection.objects.link(root);root.location=xyz(at);root.rotation_euler.z=heading
 for o in after:o.parent=root

def office():
 shell('office');desk((0,0,2.05),0);desk((-3.7,0,.2),math.pi);chair((0,0,3.55),math.pi,'office');chair((-3.7,0,-1.25),0,'office')
 box('Office window',(-2.5,3.0,-5.13),(4.8,3.25,.035),'window',.01)
 for x in [-4.93,-2.5,-.07]:box('Window frame',(x,3,-5.075),(.075,3.36,.07),'steelSeam',.012,metal=.6)
 for j in range(12):box('Slatted blind',(-2.5,4.45-j*.235,-5.00),(4.71,.025,.10),'white',.006)
 box('Window sill',(-2.5,1.37,-4.93),(4.96,.08,.33),'white',.015)
 box('Office storage',(-4.9,.8,-3.65),(1.05,1.6,1.1),'oat',.025)
 for y in [.4,.8,1.2]:box('Drawer reveal',(-4.9,y,-3.085),(.92,.017,.015),'floorJoint',.004);box('Drawer pull',(-4.9,y+.10,-3.063),(.25,.02,.023),'steelSeam',.008,metal=.6)
 box('Whiteboard frame',(4.85,2.65,-3.83),(1.65,2.53,.10),'steel',.025,metal=.55)
 board=box('OfficeBoard',(4.85,2.65,-3.765),(1.50,2.38,.015),'white',.007);board['dynamic']=True
 box('Marker tray',(4.85,1.35,-3.63),(1.65,.07,.22),'steelSeam',.015)
 for x in [4.45,4.7,5.0]:box('Board marker',(x,1.40,-3.65),(.23,.035,.035),'marker',.01)
 for x in [-3.8,0,3.8]:box('Office ceiling light',(x,5.56,.5),(1.6,.06,5.1),'white',.015,emission=.35)
 plant((5.0,0,-.1));box('Project room plate',(3.4,4.35,-5.12),(2.45,.78,.035),'white',.015)

def props():
 # Each dynamic object remains separate, with its physical origin at the base.
 lathe('TeaCup',(0,0,0),[(.068,0),(.079,.012),(.094,.055),(.116,.184),(.115,.195),(.106,.197),(.104,.185),(.084,.06),(.070,.03),(0,.029)],'porcelain',.22)
 curve('Tea handle',[(.11,.04,0),(.16,.08,0),(.16,.14,0),(.11,.17,0)],.011,'porcelain')
 cylinder('Tea liquid',(0,.15,0),.098,.012,'tea',rough=.20)
 lathe('WineGlass',(1,0,0),[(0,.20),(.032,.20),(.054,.22),(.079,.25),(.092,.30),(.096,.36),(.091,.367),(.088,.36),(.085,.30),(.072,.25),(.046,.225),(0,.216)],'porcelain',.12)
 cylinder('Wine stem',(1,.114,0),.012,.20,'porcelain',rough=.12,vertices=16);cylinder('Wine base',(1,.012,0),.095,.021,'porcelain',rough=.12);cylinder('Wine liquid',(1,.27,0),.078,.055,'tea',rough=.20)
 for o in bpy.context.scene.objects:
  if o.location.x>.7:o.location.x-=1
  elif o.type=='MESH' and o.name=='WineGlass':
   for v in o.data.vertices:v.co.x-=1
 for o in bpy.context.scene.objects:
  o['dynamic']=True
  if o.name.startswith('Wine') and 'liquid' not in o.name:
   mat=o.data.materials[0].copy();o.data.materials[0]=mat;bs=next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED');bs.inputs['Alpha'].default_value=.36;mat.surface_render_method='DITHERED';mat.use_backface_culling=False

def batch_and_export(name):
 # Join only immutable surfaces by material; controls, floor and moving doors
 # keep stable names and meshes for raycasting and animation.
 bpy.ops.object.select_all(action='DESELECT')
 for o in list(bpy.context.scene.objects):
  if o.type=='CURVE':o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.convert(target='MESH');o.select_set(False)
 bpy.context.view_layer.update();groups={}
 for o in list(bpy.context.scene.objects):
  if o.type!='MESH':continue
  o.matrix_world=o.matrix_world.copy();world=o.matrix_world.copy();o.parent=None;o.matrix_world=world
  if o.get('dynamic') or o.name in ('Floor','Ceiling'):continue
  key=o.data.materials[0].name;groups.setdefault(key,[]).append(o)
 for mat,objects in groups.items():
  bpy.ops.object.select_all(action='DESELECT')
  for o in objects:o.select_set(True)
  bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();bpy.context.object.name='Surface '+mat
 for o in list(bpy.context.scene.objects):
  if o.type=='EMPTY':bpy.data.objects.remove(o,do_unlink=True)
 for obj in bpy.context.scene.objects:
  if obj.type=='MESH':
   bpy.context.view_layer.objects.active=obj;modifier=obj.modifiers.new('Portable tangent topology','TRIANGULATE');bpy.ops.object.modifier_apply(modifier=modifier.name)
 bpy.ops.object.select_all(action='SELECT')
 bpy.ops.export_scene.gltf(filepath=str(OUT/(name+'.glb')),export_format='GLB',use_selection=True,export_apply=True,export_tangents=True,export_animations=False,export_image_format='AUTO',export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6)
 bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/(name+'.blend')),compress=True)
 print('BUILT ROOM',name,flush=True)
for name in args.only.split(','):
 reset()
 if name in ('work','family','school'):dining(name)
 elif name=='elevator':elevator()
 elif name=='office':office()
 elif name=='props':props()
 else:raise ValueError(name)
 batch_and_export('room-'+name if name!='props' else name)
