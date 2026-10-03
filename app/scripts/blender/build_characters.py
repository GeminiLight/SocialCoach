"""Build SocialCoach's CC0 cast with MPFB; see README.md in this directory.
Run only in a factory-startup background Blender process. MPFB stays external.
"""
import argparse, bmesh, bpy, json, math, os, pathlib, struct, sys
from mathutils import Matrix, Quaternion, Vector
sys.path.insert(0,str(pathlib.Path(__file__).parent))
from pigments import pigments
from identities import fit_identity, FACES
PIGMENTS=pigments()
argsv=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
p=argparse.ArgumentParser();p.add_argument('--mpfb-source',required=True);p.add_argument('--asset-root',required=True);p.add_argument('--out',required=True);p.add_argument('--only',default='chen');p.add_argument('--render',action='store_true');args=p.parse_args(argsv)
ROOT=pathlib.Path(args.asset_root);OUT=pathlib.Path(args.out);OUT.mkdir(parents=True,exist_ok=True)
sys.path.insert(0,str(pathlib.Path(args.mpfb_source)/'src'))
# Process-local registration and cache; never write Blender's user preferences.
bpy.utils.extension_path_user=lambda package,*a,**kw:str(ROOT/'mpfb-user')
import mpfb
mpfb.get_preference=lambda name:{'mpfb_user_data':str(ROOT/'mpfb-user'),'mh_auto_user_data':False}.get(name)
mpfb.register()
from mpfb.services.humanservice import HumanService
from mpfb.services.targetservice import TargetService
SYSTEM=ROOT/'system';FACE=ROOT/'faceunits'/'targets'/'faceunits'
# All models use the same real anatomical topology; identity comes from shape,
# age, stature, hairstyle and outfit, not detached procedural face fragments.
CAST={
 'chen':dict(gender=1,age=.68,weight=.61,muscle=.45,height=3.12,hair='short04',clothes='male_elegantsuit01',skin='middleage_asian_male',brow='eyebrow002'),
 'lin':dict(gender=0,age=.44,weight=.45,muscle=.35,height=3.00,hair='ponytail01',clothes='toigo_female_double-breasted_suit',skin='young_asian_female',brow='eyebrow003'),
 'zhou':dict(gender=1,age=.27,weight=.40,muscle=.37,height=3.05,hair='short02',clothes='male_casualsuit01',skin='young_asian_male',brow='eyebrow001'),
 'aunt':dict(gender=0,age=.70,weight=.65,muscle=.30,height=2.93,hair='bob02',clothes='female_casualsuit01',skin='middleage_asian_female',brow='eyebrow006'),
 'mom':dict(gender=0,age=.67,weight=.49,muscle=.30,height=2.88,hair='ponytail01',clothes='female_casualsuit02',skin='middleage_asian_female',brow='eyebrow004'),
 'dad':dict(gender=1,age=.76,weight=.58,muscle=.35,height=3.03,hair='short04',clothes='male_casualsuit06',skin='old_asian_male',brow='eyebrow002'),
 'senior':dict(gender=1,age=.27,weight=.47,muscle=.59,height=3.18,hair='short04',clothes='male_casualsuit03',skin='young_asian_male',brow='eyebrow005'),
 'yue':dict(gender=0,age=.25,weight=.41,muscle=.35,height=2.90,hair='ponytail01',clothes='female_casualsuit01',skin='young_asian_female',brow='eyebrow003'),
 'kai':dict(gender=1,age=.26,weight=.54,muscle=.34,height=3.04,hair='short01',clothes='male_casualsuit02',skin='young_asian_male',brow='eyebrow001'),
 'fang':dict(gender=0,age=.46,weight=.42,muscle=.40,height=3.08,hair='bob02',clothes='toigo_female_suit',skin='young_asian_female',brow='eyebrow005'),
 'qiao':dict(gender=1,age=.50,weight=.58,muscle=.55,height=3.22,hair='short02',clothes='male_elegantsuit01',skin='middleage_asian_male',brow='eyebrow002'),
 'cheng':dict(gender=0,age=.30,weight=.39,muscle=.30,height=2.98,hair='ponytail01',clothes='female_casualsuit02',skin='young_asian_female',brow='eyebrow004'),
 'he':dict(gender=1,age=.72,weight=.60,muscle=.40,height=3.06,hair='short02',clothes='male_elegantsuit01',skin='middleage_asian_male',brow='eyebrow006'),
 'ning':dict(gender=0,age=.43,weight=.51,muscle=.40,height=2.97,hair='bob02',clothes='female_casualsuit02',skin='young_asian_female',brow='eyebrow003'),
 'rui':dict(gender=1,age=.29,weight=.38,muscle=.39,height=3.15,hair='short04',clothes='male_casualsuit01',skin='young_asian_male',brow='eyebrow005'),
 'player':dict(gender=1,age=.33,weight=.47,muscle=.40,height=3.10,hair='short02',clothes='male_casualsuit02',skin='young_asian_male',brow='eyebrow001'),
}
def clean():
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
 for data in (bpy.data.meshes,bpy.data.armatures,bpy.data.materials,bpy.data.images,bpy.data.actions):
  for item in list(data):
   if item.users==0:data.remove(item)
def simple_material(obj,fn,kind):
 fields={}
 for line in pathlib.Path(fn).read_text().splitlines():
  if line.strip() and not line.startswith('#'):
   key,*value=line.split();fields[key]=' '.join(value)
 mat=bpy.data.materials.new(kind);mat.use_nodes=True;mat.diffuse_color=(1,1,1,1)
 nodes=mat.node_tree.nodes;bs=next(n for n in nodes if n.type=='BSDF_PRINCIPLED')
 bs.inputs['Roughness'].default_value=.68 if kind=='skin' else .86 if kind=='cloth' else .5
 if kind=='skin':bs.inputs['Subsurface Weight'].default_value=.06
 diffuse=fields.get('diffuseTexture')
 if diffuse:
  path=pathlib.Path(fn).parent/diffuse;img=bpy.data.images.load(str(path),check_existing=True)
  maximum=1024 if kind=='skin' else 512
  if max(img.size)>maximum:img.scale(int(img.size[0]*maximum/max(img.size)),int(img.size[1]*maximum/max(img.size)))
  if kind=='skin':
   cached=ROOT/'texture-cache';cached.mkdir(exist_ok=True);jpg=cached/(path.stem+'.jpg');img.file_format='JPEG';img.filepath_raw=str(jpg);img.save();img=bpy.data.images.load(str(jpg),check_existing=True)
  texture=nodes.new('ShaderNodeTexImage');texture.image=img
  mat.node_tree.links.new(texture.outputs['Color'],bs.inputs['Base Color'])
  if fields.get('transparent')=='True' and kind!='eyes':
   mat.node_tree.links.new(texture.outputs['Alpha'],bs.inputs['Alpha']);mat.surface_render_method='DITHERED';mat.alpha_threshold=.35
   mat.use_backface_culling=False
   # glTF exporter uses threshold > 0 with the clip-equivalent render mode.
   mat.surface_render_method='DITHERED'
  if kind=='hair':bs.inputs['Roughness'].default_value=.84
 obj.data.materials.clear();obj.data.materials.append(mat)
 return mat

def asset(base,subdir,name,atype,kind):
 assetroot=ROOT/'suits' if name.startswith('toigo_') else SYSTEM
 fn=assetroot/subdir/name/(name+'.mhclo')
 mesh=HumanService.add_mhclo_asset(str(fn),base,asset_type=atype,subdiv_levels=0)
 mhmat=SYSTEM/'eyes'/'materials'/'brown.mhmat' if subdir=='eyes' else next((assetroot/subdir/name).glob('*.mhmat'))
 simple_material(mesh,mhmat,kind);mesh.name=atype.lower();return mesh

from rigposes import pose

def camera(name,position,target,lens=50):
 bpy.ops.object.camera_add(location=position);cam=bpy.context.object;cam.name=name
 cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.lens=lens;bpy.context.scene.camera=cam

def render(id,rig):
 pose(rig,True)
 bpy.ops.mesh.primitive_plane_add(size=200);floor=bpy.context.object;floor.name='Preview floor'
 mat=bpy.data.materials.new('Preview ground');mat.diffuse_color=(.19,.18,.16,1);floor.data.materials.append(mat)
 for position,energy,size in [((-3,-4,6),320,5),((3,-2,4),180,4),((0,3,5),220,3)]:
  bpy.ops.object.light_add(type='AREA',location=position);lamp=bpy.context.object;lamp.data.energy=energy;lamp.data.shape='DISK';lamp.data.size=size;lamp.rotation_euler=(Vector((0,0,1.8))-lamp.location).to_track_quat('-Z','Y').to_euler()
 camera('Portrait',(0,-5,2.7),(0,0,2.1),58)
 scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24;scene.render.resolution_x=900;scene.render.resolution_y=1100;scene.render.resolution_percentage=100
 scene.world.color=(.15,.15,.15);scene.view_settings.view_transform='AgX';scene.render.filepath=str(OUT/(id+'-preview.png'));bpy.ops.render.render(write_still=True)

def glasses(rig,eyes,id):
 left=[v.co for v in eyes.data.vertices if v.co.x>0];center=Vector(tuple((max(v[i] for v in left)+min(v[i] for v in left))/2 for i in range(3)))
 front=min(v.co.y for v in eyes.data.vertices)-.012;objects=[]
 for side in [-1,1]:
  points=[]
  for j in range(33):
   a=j*math.tau/32;points.append((side*center.x+.026*math.cos(a),front,center.z+.016*math.sin(a)))
  objects.append(wire('Spectacle rim',points,.0017))
  objects.append(wire('Spectacle temple',[(side*(center.x+.026),front,center.z),(side*.073,front+.08,center.z-.005),(side*.070,front+.11,center.z-.025)],.0015))
 objects.append(wire('Spectacle bridge',[(-.012,front,center.z+.002),(0,front-.005,center.z+.009),(.012,front,center.z+.002)],.0015))
 mat=bpy.data.materials.new('sc:steelSeam');mat.use_nodes=True;bs=next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED');bs.inputs['Base Color'].default_value=(*PIGMENTS['steelSeam'],1);bs.inputs['Metallic'].default_value=.65;bs.inputs['Roughness'].default_value=.32
 for obj in objects:
  bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj;bpy.ops.object.convert(target='MESH');obj=bpy.context.object;obj.data.materials.append(mat)
  group=obj.vertex_groups.new(name='head');group.add(list(range(len(obj.data.vertices))),1,'REPLACE');obj.parent=rig;modifier=obj.modifiers.new('Head attachment','ARMATURE');modifier.object=rig

def wire(name,points,r):
 data=bpy.data.curves.new(name,'CURVE');data.dimensions='3D';data.bevel_depth=r;data.bevel_resolution=2;spline=data.splines.new('POLY');spline.points.add(len(points)-1)
 for point,co in zip(spline.points,points):point.co=(*co,1)
 obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj);return obj

def patch_alpha(file):
 raw=file.read_bytes();length=struct.unpack_from('<I',raw,12)[0];data=json.loads(raw[20:20+length]);tail=raw[20+length:]
 for material in data['materials']:
  if material['name'] in ('hair','brows'):
   material['alphaMode']='MASK';material['alphaCutoff']=.35;material['doubleSided']=True
  elif material['name']=='eyes':material['alphaMode']='OPAQUE';material['doubleSided']=False
 # glTF skins use joint world transforms; mesh-parent transforms are undefined.
 skinned=[i for i,node in enumerate(data['nodes']) if 'skin' in node]
 for node in data['nodes']:
  if 'children' in node:node['children']=[i for i in node['children'] if i not in skinned]
 for scene in data['scenes']:
  scene['nodes']=list(dict.fromkeys(scene.get('nodes',[])+skinned))
 encoded=json.dumps(data,separators=(',',':')).encode();encoded+=b' '*((-len(encoded))%4)
 file.write_bytes(struct.pack('<III',0x46546C67,2,20+len(encoded)+len(tail))+struct.pack('<II',len(encoded),0x4E4F534A)+encoded+tail)

def build(id,cfg):
 clean();macro=TargetService.get_default_macro_info_dict();macro.update({k:cfg[k] for k in ('gender','age','weight','muscle')});macro['race']={'asian':.88,'caucasian':.12,'african':0}
 base=HumanService.create_human(macro_detail_dict=macro);base.name='skin'
 fit_identity(base,id,pathlib.Path(args.mpfb_source)/'src/mpfb/data/targets',TargetService)
 # Bake only identity shapes before adding the small expressive morph set.
 bpy.context.view_layer.objects.active=base
 bpy.ops.object.shape_key_remove(all=True,apply_mix=True)
 simple_material(base,SYSTEM/'skins'/cfg['skin']/(cfg['skin']+'.mhmat'),'skin')
 rig=HumanService.add_builtin_rig(base,'game_engine');rig.name='SocialCoachRig'
 asset(base,'eyes','low-poly','Eyes','eyes')
 asset(base,'eyebrows',cfg['brow'],'Eyebrows','brows')
 asset(base,'hair',cfg['hair'],'Hair','hair')
 if cfg['hair']=='bob02':
  # Open the brow line instead of letting the source fringe cover an eye.
  eyes=bpy.data.objects['eyes'];eye_top=max(v.co.z for v in eyes.data.vertices);eye_front=min(v.co.y for v in eyes.data.vertices);width=max(abs(v.co.x) for v in eyes.data.vertices)*1.2
  for vertex in bpy.data.objects['hair'].data.vertices:
   if vertex.co.y<eye_front+.008 and vertex.co.z<eye_top+.042:
    blend=max(0,min(1,(width-abs(vertex.co.x))/(width*.32)));vertex.co.z+=(eye_top+.042-vertex.co.z)*blend
 asset(base,'teeth','teeth_base','Teeth','teeth')
 clothes=asset(base,'clothes',cfg['clothes'],'Clothes','cloth')
 if cfg['clothes'] in ('female_casualsuit01','female_casualsuit02','male_casualsuit02','male_casualsuit03','male_casualsuit04','male_casualsuit05','male_casualsuit06'):
  # Remove the source project's printed logo; retain the fitted cloth topology
  # and photographed trousers. The top uses the cast's CSS fabric pigment.
  token={'aunt':'wine','mom':'sage','dad':'oat','senior':'white','yue':'sage','kai':'navy','cheng':'oat','ning':'oat','player':'navy'}.get(id,'teal')
  mat=bpy.data.materials.new('sc:'+token);mat.use_nodes=True;bs=next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED');bs.inputs['Base Color'].default_value=(*PIGMENTS[token],1);bs.inputs['Roughness'].default_value=.89;clothes.data.materials.append(mat)
  waist=rig.data.bones['pelvis'].head_local.z+.035
  for poly in clothes.data.polygons:
   if sum(clothes.data.vertices[i].co.z for i in poly.vertices)/len(poly.vertices)>waist:poly.material_index=1
 asset(base,'clothes','shoes01','Clothes','shoes')
 if id in ('zhou','kai','dad','he'):glasses(rig,bpy.data.objects['eyes'],id)
 # Keep the cast's dark / salt-and-pepper hair consistent with the setting;
 # several source wigs are blond even when their filename is neutral.
 hair=bpy.data.objects['hair'];mat=hair.data.materials[0];bs=next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
 tex=next(n for n in mat.node_tree.nodes if n.type=='TEX_IMAGE');img=tex.image.copy();img.scale(512,512);pixels=list(img.pixels[:]);tint=PIGMENTS['hairGray' if id in ('dad','he') else 'hairHighlight']
 for i in range(0,len(pixels),4):
  value=sum(pixels[i:i+3])/3
  for c in range(3):pixels[i+c]=min(1,(.65+value*.8)*tint[c]**(1/2.2))
 img.pixels[:]=pixels;img.pack();tex.image=img
 for morph in ['eyeBlinkLeft','eyeBlinkRight','jawOpen','browInnerUp','mouthSmileLeft','mouthSmileRight']:
  key=TargetService.load_target(base,str(FACE/(morph+'.target')),weight=0);key.name=morph
 for combined,left,right in [('blink','eyeBlinkLeft','eyeBlinkRight'),('smile','mouthSmileLeft','mouthSmileRight')]:
  keys=base.data.shape_keys.key_blocks;basis=keys[0];merged=base.shape_key_add(name=combined);merged.value=0
  for i,v in enumerate(merged.data):v.co=keys[left].data[i].co+keys[right].data[i].co-basis.data[i].co
  base.shape_key_remove(keys[left]);base.shape_key_remove(keys[right])
 # bmesh preserves UV, weights and shape-key layers while removing helpers and
 # hidden skin under clothing. Export must contain no giant invisible cages.
 bm=bmesh.new();bm.from_mesh(base.data);deform=bm.verts.layers.deform.active
 body=base.vertex_groups.get('body');deletes=[g.index for g in base.vertex_groups if g.name.startswith('Delete.')]
 remove=[v for v in bm.verts if v[deform].get(body.index,0)<.5 or any(v[deform].get(g,0)>.5 for g in deletes)]
 bmesh.ops.delete(bm,geom=remove,context='VERTS');bm.to_mesh(base.data);bm.free()
 for modifier in list(base.modifiers):
  if modifier.type=='MASK':base.modifiers.remove(modifier)
 for mesh in [o for o in bpy.context.scene.objects if o.type=='MESH']:
  for poly in mesh.data.polygons:poly.use_smooth=True
 total=max(v.co.z for v in base.data.vertices);scale=cfg['height']/total;rig.scale=(scale,)*3
 eye=max(v.co.z for v in bpy.data.objects['eyes'].data.vertices)*scale-.03
 pelvis=rig.data.bones['pelvis'].head_local.z*scale;drop=pelvis-1.06
 info={'id':id,'height':cfg['height'],'standingEye':round(eye,4),'seatedEye':round(eye-drop,4),'pelvis':round(pelvis,4),'scale':round(scale,4),'faceTargets':FACES[id]}
 # Named pose clips retain anatomy and clothing weights. Web transitions use
 # the real event timeline; visual animation never becomes dialogue evidence.
 for seated in (False,True):
  for kind in ('idle','toast','phone','palm','fold','lean'):
   pose(rig,seated,kind);name=('Seated' if seated else 'Standing')+kind.title()
   action=bpy.data.actions.new(name);rig.animation_data_create();rig.animation_data.action=action
   for bone in rig.pose.bones:
    for frame in (1,25):bone.keyframe_insert('rotation_quaternion',frame=frame);bone.keyframe_insert('location',frame=frame)
   track=rig.animation_data.nla_tracks.new();track.name=name;track.strips.new(name,1,action);track.mute=True
 rig.animation_data.action=None;pose(rig)
 bpy.context.scene.frame_start=1;bpy.context.scene.frame_end=25
 bpy.ops.object.select_all(action='DESELECT')
 for obj in bpy.context.scene.objects:
  if obj.type in ('MESH','ARMATURE'):obj.select_set(True)
 bpy.ops.export_scene.gltf(filepath=str(OUT/(id+'.glb')),export_format='GLB',use_selection=True,export_apply=False,export_animations=True,export_animation_mode='ACTIONS',export_morph=True,export_morph_normal=False,export_image_format='AUTO',export_jpeg_quality=85,export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6)
 patch_alpha(OUT/(id+'.glb'))
 (OUT/(id+'.json')).write_text(json.dumps(info,indent=2));print('BUILT',id,info,flush=True)
 for image in list(bpy.data.images):
  if image.users==0:bpy.data.images.remove(image)
 bpy.ops.file.pack_all()
 bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/(id+'.blend')),compress=True)
 if args.render:render(id,rig)
for id in args.only.split(','):build(id,CAST[id])
