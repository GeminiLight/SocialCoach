"""Author five coherent environments and reusable props in Blender.
World anchors deliberately match spaces.ts so old saved rooms remain valid.
Pigments are read from globals.css; photographs are the attributed CC0 sources.
"""
import argparse,bpy,json,math,pathlib,re,sys
from mathutils import Vector
sys.path.insert(0,str(pathlib.Path(__file__).parent))
from surface_detail import add_surface_detail
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
 if not photo:
  if pigment in ('napkin','chair','sage','oat','terracotta','charcoal','wallInset') and rough>=.85:add_surface_detail(mat,'woven')
  elif pigment in ('wall','officeWall','floor','officeFloor'):add_surface_detail(mat,'plaster')
  if pigment in ('porcelain','ceramic') and rough<.6:
   bs.inputs['Coat Weight'].default_value=.22;bs.inputs['Coat Roughness'].default_value=.22
 if photo:
  # The attributed wood photo supplies broad grain, treated in the same pigment
  # language as the animated cast. No high-frequency photographic relief or
  # roughness maps competing with the characters. Geometry still catches light.
  fn=ROOT/'textures'/(photo+'_diff.jpg');original=bpy.data.images.load(str(fn),check_existing=True)
  img=original.copy();img.scale(256,256);pixels=list(img.pixels[:]);tint=PIGMENTS[pigment]
  for index in range(0,len(pixels),4):
   value=sum(pixels[index:index+3])/3
   for c in range(3):pixels[index+c]=max(0,min(1,tint[c]*(.90+.22*value)))**(1/2.2)
   pixels[index+3]=1
  img.pack();tex=mat.node_tree.nodes.new('ShaderNodeTexImage');tex.image=img
  mat.node_tree.links.new(tex.outputs['Color'],bs.inputs['Base Color']);bs.inputs['Roughness'].default_value=max(.60,rough)
 for node in mat.node_tree.nodes:
  if node.type=='NORMAL_MAP':node.inputs['Strength'].default_value=min(.12,node.inputs['Strength'].default_value)
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
 if photo:
  uv=o.data.uv_layers.active
  for face in o.data.polygons:
   if abs(face.normal.z)>.5:
    for index in face.loop_indices:
     v=o.data.vertices[o.data.loops[index].vertex_index].co;uv.data[index].uv=(v.x/2.6,v.y/2.6)
 return finish(o,name,material(pigment,rough,metal,photo),min(.014,depth*.14))
def sphere(name,at,scale,pigment,rough=.55):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=12,location=xyz(at));o=bpy.context.object;o.scale=(scale[0],scale[2],scale[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);return finish(o,name,material(pigment,rough))
def curve(name,points,r,pigment,metal=0):
 data=bpy.data.curves.new(name,'CURVE');data.dimensions='3D';data.resolution_u=6 if r<.01 else 12;data.bevel_depth=r;data.bevel_resolution=1 if r<.01 else 3
 spline=data.splines.new('BEZIER');spline.bezier_points.add(len(points)-1)
 for bp,v in zip(spline.bezier_points,points):bp.co=xyz(v);bp.handle_left_type='AUTO';bp.handle_right_type='AUTO'
 o=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(o);o.data.materials.append(material(pigment,.45,metal));return o
def lathe(name,at,profile,pigment,rough=.35,metal=0,top_surface=False):
 segments=48;verts=[];faces=[]
 for radius,height in profile:
  for i in range(segments):a=i*math.tau/segments;verts.append(xyz((at[0]+radius*math.cos(a),at[1]+height,at[2]+radius*math.sin(a))))
 for j in range(len(profile)-1):
  for i in range(segments):
   face=(j*segments+i,(j+1)*segments+i,(j+1)*segments+(i+1)%segments,j*segments+(i+1)%segments)
   faces.append(tuple(reversed(face)) if top_surface else face)
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update()
 uv=mesh.uv_layers.new(name='Turned surface UV')
 for face in mesh.polygons:
  j=face.index//segments;i=face.index%segments
  coordinates=[(i/segments,j/(len(profile)-1)),(i/segments,(j+1)/(len(profile)-1)),((i+1)/segments,(j+1)/(len(profile)-1)),((i+1)/segments,j/(len(profile)-1))]
  if top_surface:coordinates.reverse()
  for index,coordinate in zip(face.loop_indices,coordinates):uv.data[index].uv=coordinate
  # Outside rises, inside falls; top sheets / ribbons reverse that profile.
  # glTF format validation cannot detect a consistently inside-out surface.
  dr=profile[j+1][0]-profile[j][0];dh=profile[j+1][1]-profile[j][1]
  if face.area>1e-9:
   radial=Vector((face.center.x-at[0],face.center.y+at[2],0))
   if abs(dh)>1e-7 and radial.length>1e-7:
    assert face.normal.dot(radial)*dh*(-1 if top_surface else 1)>0,name+' has reversed side normals'
   elif abs(dr)>1e-7:
    assert face.normal.z*dr*(-1 if top_surface else 1)<0,name+' has reversed horizontal normals'
 o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);finish(o,name,material(pigment,rough,metal));return o
def plate(at,r=.35,pigment='porcelain'):
 # A thin porcelain rim and shallow well, rather than a solid white disc.
 dish=lathe('Glazed plate',at,[(0,0),(.08,0),(.09,.018),(r*.7,.026),(r,.052),(r,.060),(r*.95,.066),(r*.68,.045),(0,.04)],pigment,.24)
 lathe('Painted glaze ring',at,[(r*.85,.059),(r*.875,.061)],'ceramic',.24,top_surface=True)
 return dish

def leaf(at,a,length=.22):
 # Folded bok choy: tapered blade, raised vein and a pale edible stalk.
 verts=[];faces=[]
 for j in range(7):
  t=j/6;w=.075*math.sin(math.pi*t)**.65
  for k in range(5):
   q=(k-2)/2;u=q*w;v=(t-.5)*length
   verts.append(xyz((at[0]+u*math.cos(a)+v*math.sin(a),at[1]+.015*(1-q*q)+.015*math.sin(t*math.pi)+.009*math.sin(j+k*2),at[2]-u*math.sin(a)+v*math.cos(a))))
 for j in range(6):
  for k in range(4):i=j*5+k;faces.append((i,i+1,i+6,i+5))
 mesh=bpy.data.meshes.new('Leaf blade');mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new('Bok choy leaf',mesh);bpy.context.collection.objects.link(o);finish(o,o.name,material('green',.4))
 curve('Bok choy stalk',[(at[0]-math.sin(a)*length*.4,at[1]+.01,at[2]-math.cos(a)*length*.4),at,(at[0]+math.sin(a)*length*.38,at[1]+.02,at[2]+math.cos(a)*length*.38)],.012,'rice')

def dumpling(at,a,index):
 # Crescent dough with a pinched ridge and individually varied pleats.
 body=sphere('Dumpling dough',at,(.105,.050,.065),'rice',.61);body.rotation_euler.z=a
 for j in range(7):
  x=(j-3)*.023;h=.055*math.sqrt(max(0,1-(x/.11)**2))
  def point(u,v,y):return(at[0]+u*math.cos(a)+v*math.sin(a),at[1]+y,at[2]-u*math.sin(a)+v*math.cos(a))
  curve('Pinched dough pleat',[point(x-.009,-.028,h*.48),point(x,0,h),point(x+.009,.022,h*.55)],.003,'porcelain')
 if index%3==0:
  # Small browned underside, not a decal or repeated white pearl.
  sphere('Golden dough edge',(at[0],at[1]-.025,at[2]+.008),(.087,.010,.055),'food',.7)

def tomato(at,a):
 # Wedge silhouette, juicy cut face, pale core and visible seeds.
 body=sphere('Tomato wedge',at,(.10,.036,.064),'red',.32);body.rotation_euler.z=a
 core=sphere('Tomato cut face',(at[0],at[1]+.026,at[2]),(.082,.013,.050),'food',.42);core.rotation_euler.z=a
 for j in range(3):
  t=a+j*2.1;x=at[0]+math.sin(t)*.038;z=at[2]+math.cos(t)*.03
  sphere('Tomato seed',(x,at[1]+.04,z),(.009,.003,.005),'rice',.4)

def fish(at):
 x,y,z=at
 sphere('Steamed fish body',(x,y,z),(.32,.065,.12),'rice',.46)
 sphere('Fish head',(x-.29,y,z),(.115,.064,.097),'food',.48)
 for side in [-1,1]:
  sphere('Fish eye',(x-.327,y+.043,z+side*.073),(.014,.011,.008),'porcelain',.32)
  sphere('Fish pupil',(x-.329,y+.048,z+side*.079),(.007,.006,.003),'dark',.22)
 curve('Fish gill',[(x-.23,y+.044,z-.075),(x-.205,y+.065,z),(x-.23,y+.044,z+.075)],.003,'woodEdge')
 for j in range(9):
  xx=x-.17+j*.045
  curve('Fish skin score',[(xx-.01,y+.035,z-.091),(xx,y+.067,z),(xx+.015,y+.035,z+.091)],.002,'food')
 # A fan tail keeps the fish readable from either seat at the table.
 outline=[(x+.28,y,z),(x+.45,y+.014,z-.10),(x+.41,y+.026,z),(x+.45,y+.014,z+.10)]
 verts=[xyz(v) for v in outline]+[xyz((xx,yy-.008,zz)) for xx,yy,zz in outline]
 faces=[(0,1,2),(0,2,3),(6,5,4),(7,6,4),(0,4,5,1),(1,5,6,2),(2,6,7,3),(3,7,4,0)]
 mesh=bpy.data.meshes.new('Fish tail');mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new('Fish tail',mesh);bpy.context.collection.objects.link(o);finish(o,o.name,material('food',.55))
 for i in range(6):
  xx=x-.13+i*.052
  curve('Scallion garnish',[(xx-.04,y+.07,z-.04),(xx,y+.085,z),(xx+.035,y+.072,z+.06)],.006,'green' if i%2 else 'rice')
def bowl(at,r=.23):return lathe('Ceramic bowl',at,[(.08,0),(.1,.014),(.12,.05),(r,.17),(r,.19),(r-.014,.195),(.11,.07),(.065,.034),(0,.034)],'ceramic')
def spoon(at,heading):
 before=set(bpy.context.scene.objects)
 cup=lathe('Porcelain spoon bowl',(0,0,0),[(0,0),(.055,0),(.078,.018),(.086,.031),(.083,.037),(.072,.030),(.032,.012),(0,.012)],'porcelain',.24)
 cup.scale=(.66,1.25,.65)
 curve('Porcelain spoon handle',[(0,.021,.075),(0,.017,.22),(0,.027,.40)],.012,'porcelain')
 root=bpy.data.objects.new('Spoon placement',None);bpy.context.collection.objects.link(root);root.location=xyz(at);root.rotation_euler.z=heading
 for obj in set(bpy.context.scene.objects)-before:
  if obj!=root:obj.parent=root

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
   origin=(at[0]+dx*(.12+t*.25),h*t,at[2]+dz*(.12+t*.25));verts=[];faces=[]
   # Pointed, folded leaves catching light along their centre vein.
   for j in range(9):
    u=j/8;width=.17*math.sin(math.pi*u)**.8
    for k in range(5):
     q=(k-2)/2;along=u*.62
     verts.append(xyz((origin[0]+dx*along+dz*q*width,origin[1]+u*.19+.06*(1-q*q)*math.sin(math.pi*u),origin[2]+dz*along-dx*q*width)))
   for j in range(8):
    for k in range(4):i=j*5+k;faces.append((i,i+1,i+6,i+5))
   mesh=bpy.data.meshes.new('Folded foliage');mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new('Pointed leaf',mesh);bpy.context.collection.objects.link(o);mat=material('leaf',.72);mat.use_backface_culling=False;finish(o,o.name,mat)

def curtain(x,z,width=1.0,height=3.7):
 verts=[];faces=[];columns=48;rows=8
 for j in range(rows+1):
  for i in range(columns+1):
   px=x-width/2+width*i/columns;py=1.1+height*j/rows;pz=z+.09*math.sin(i/columns*math.tau*5)
   verts.append(xyz((px,py,pz)))
 for j in range(rows):
  for i in range(columns):n=j*(columns+1)+i;faces.append((n,n+1,n+columns+2,n+columns+1))
 mesh=bpy.data.meshes.new('Curtain folds');mesh.from_pydata(verts,[],faces);mesh.update()
 uv=mesh.uv_layers.new(name='Fabric UV')
 for face in mesh.polygons:
  for index in face.loop_indices:
   vertex=mesh.loops[index].vertex_index;uv.data[index].uv=(vertex%(columns+1)/columns,vertex//(columns+1)/rows)
 o=bpy.data.objects.new('Woven curtain',mesh);bpy.context.collection.objects.link(o);finish(o,o.name,material('napkin',.95))
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
 if kind=='work':
  # A fitted banquet linen quiets the large foreground without hiding the
  # existing table edge, physical dishes, turntable or navigation anchors.
  lathe('Fitted banquet linen',(0,1.713,0),[(0,0),(2.60,0),(2.673,-.018),(2.684,-.16)],'napkin',.94,top_surface=True)
 cylinder('Lazy susan',(0,1.736,0),1.54,.035,'ceramic' if kind=='family' else 'porcelain',rough=.22)
 seats=[(0,-3.05,0),(-2.65,-1.55,1.04),(2.65,-1.55,-1.04),(0,3.55,math.pi)]
 for x,z,a in seats:
  chair((x,0,z),a,kind);r=math.hypot(x,z);sx=x/r*2.14;sz=z/r*2.14
  # Individual woven settings make the edge of a lived-in table readable.
  box('Woven placemat',(sx,1.716,sz),(.91,.014,.70),'wallInset' if kind=='work' else 'napkin',.018,rotation=a,rough=.96)
  plate((sx,1.724,sz));bowl((sx,1.765,sz),.19)
  spoon((sx+.36*math.cos(a),1.724,sz-.18*math.sin(a)),a)
  cx=sx-.38*math.cos(a);cz=sz+.38*math.sin(a)
  box('Folded linen',(cx,1.73,cz),(.23,.035,.43),'napkin',.015,rotation=a,rough=.98)
  for side in [-.04,.04]:
   # Chopsticks have a tapered profile, real gaps and a ceramic rest.
   o=cylinder('Wood chopstick',(cx+side*math.cos(a),1.762,cz),.009,.58,'woodEdge',top=.005,vertices=10);o.rotation_euler=(math.pi/2,0,a)
  box('Chopstick rest',(cx,1.745,cz-.15),(.15,.035,.04),'ceramic',.012,rotation=a)
 before_meals=set(bpy.context.scene.objects)
 dishes=[(-.78,-.72,'fish'),(.74,-.78,'greens'),(1.07,.28,'meat'),(.05,1.10,'tomato'),(-.93,.39,'dumplings')]
 if kind=='family':dishes=[(-.72,-.7,'fish'),(.65,-.83,'tomato'),(1.0,.25,'greens'),(.02,1.04,'soup'),(-.99,.38,'dumplings')]
 if kind=='school':dishes=[(-.73,-.73,'meat'),(.76,-.78,'greens'),(1.04,.29,'tomato'),(.0,1.06,'noodles'),(-.98,.39,'dumplings')]
 for x,z,food in dishes:
  plate((x,1.772,z),.43)
  for i in range(9):
   a=i*2.399+math.sin(i*1.37)*.25;radius=math.sqrt(i/10)*.25;px=x+math.cos(a)*radius;pz=z+math.sin(a)*radius
   if food=='greens':
    leaf((px,1.84+(i%3)*.017,pz),a,.19+(i%4)*.02)
   elif food=='dumplings':
    dumpling((px,1.865+(i%2)*.009,pz),a,i)
   elif food=='tomato':
    tomato((px,1.85,pz),a)
    for j in range(3):sphere('Scrambled egg',(px+.045+j*.018,1.858+(j%2)*.01,pz+.035),(.035,.024,.028),'rice',.65)
   elif food=='meat':
    box('Braised meat',(px,1.855+(i%2)*.012,pz),(.115+(i%3)*.008,.068,.095),'food',.026,rotation=a,rough=.42)
    glaze=box('Meat glaze',(px,1.892+(i%2)*.012,pz),(.10,.013,.086),'tea',.012,rotation=a,rough=.22)
    if i%2==0:curve('Spring onion',[(px-.04,1.91,pz-.03),(px,1.927,pz),(px+.025,1.919,pz+.04)],.007,'green')
   elif food=='soup' and i<6:sphere('Soup garnish',(px,1.992,pz),(.033,.010,.02),'green',.42)
   elif food=='noodles':
    for j in range(5):
     curve('Noodle strand',[(px-.06,1.824+j*.009,pz-.035),(px+.01,1.842+j*.009,pz+.015),(px+.07,1.831+j*.009,pz-.045)],.005,'rice')
  if food=='fish':fish((x,1.872,z))
  if food=='soup':
   bowl((x,1.82,z),.35);cylinder('Clear broth',(x,1.985,z),.273,.008,'tea',rough=.25)
 # Plate feet contact the lazy susan rather than floating above it.
 for obj in set(bpy.context.scene.objects)-before_meals:obj.location.z-=.018
 teapot=(-1.5,1.73,-.92);sphere('Teapot body',(teapot[0],teapot[1]+.13,teapot[2]),(.20,.15,.19),'ceramic');cylinder('Teapot lid',(teapot[0],teapot[1]+.278,teapot[2]),.135,.022,'ceramic');sphere('Lid knob',(teapot[0],teapot[1]+.308,teapot[2]),(.035,.026,.035),'brass')
 curve('Teapot handle',[(-1.69,1.80,-.92),(-1.80,1.94,-.92),(-1.68,2.02,-.92)],.025,'ceramic');curve('Teapot spout',[(-1.36,1.82,-.92),(-1.20,1.95,-.92),(-1.19,2.03,-.92)],.035,'ceramic')
 if kind=='work':
  lathe('Green bottle',(1.65,1.70,-.9),[(.11,0),(.11,.36),(.057,.43),(.037,.59),(.037,.61)],'bottle',.2);cylinder('Bottle cap',(1.65,2.33,-.9),.042,.04,'brass',metal=.5)

def dining(kind):
 shell(kind);table(kind);plant((-4.75,0,-3.45))
 if kind in ('work','family'):
  # Keep rug hits on the navigable Floor mesh; a decorative layer must not
  # silently swallow click-to-walk or change the navigation collision model.
  floor=bpy.data.objects['Floor']
  rug=box('Dining rug',(0,.008,.22),(6.22,.012,6.6),'wallInset',.002,rough=.94)
  bpy.ops.object.select_all(action='DESELECT');floor.select_set(True);rug.select_set(True);bpy.context.view_layer.objects.active=floor;bpy.ops.object.join();floor.name='Floor'
 box('Sideboard',(4.85,.8,-3.8),(1.3,1.55,.70),'woodEdge',.035,photo='wood_table_001')
 box('Sideboard top',(4.85,1.61,-3.8),(1.4,.07,.80),'wood',.02,photo='wood_table_001')
 for x in [4.55,5.15]:box('Sideboard door',(x,.80,-3.435),(.55,1.35,.02),'wood',.02,photo='wood_table_001');box('Cabinet handle',(x,.99,-3.412),(.15,.025,.025),'brass',.008,metal=.7)
 if kind in ('work','family'):
  box('Tea tray',(4.85,1.67,-3.73),(.79,.045,.42),'wood',.018,photo='wood_table_001')
  for x in [4.65,4.97]:
   lathe('Spare tea cup',(x,1.694,-3.73),[(0,0),(.055,0),(.075,.13),(.067,.136),(.052,.025),(0,.025)],'porcelain',.24)
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
 cylinder('Wine stem',(1,.114,0),.012,.20,'porcelain',rough=.12,vertices=16);cylinder('Wine base',(1,.012,0),.075,.021,'porcelain',rough=.12)
 lathe('Wine liquid',(1,0,0),[(0,.217),(.005,.218),(.043,.226),(.068,.252),(.078,.282),(0,.282)],'wine',.20)
 for o in bpy.context.scene.objects:
  # Every part uses the cup's origin, whether coordinates live in its mesh
  # (turned surfaces) or object transform (cylinders).
  if o.name.startswith('Wine'):o.location.x-=1
 bpy.context.view_layer.update()
 for o in bpy.context.scene.objects:
  if o.type=='MESH' and o.name.startswith('Wine'):
   assert all(abs((o.matrix_world@Vector(v)).x)<.2 for v in o.bound_box),o.name+' is detached from its vessel'
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
