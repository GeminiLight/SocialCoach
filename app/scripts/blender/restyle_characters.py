"""Restyle packed anatomical sources; always read an unchanged source directory.
For a clean rebuild, build_characters.py runs the same transformation before
export. This faster path allows visual iteration without repeating MPFB fitting.
"""
import argparse,bmesh,bpy,json,pathlib,struct,sys
sys.path.insert(0,str(pathlib.Path(__file__).parent))
from animation_style import apply_animation_style,STYLE
from pigments import pigments
from rigposes import pose
argv=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
p=argparse.ArgumentParser();p.add_argument('--source',required=True);p.add_argument('--out',required=True);p.add_argument('--save',required=True);p.add_argument('--only',default='chen');p.add_argument('--render',action='store_true');args=p.parse_args(argv)
SRC=pathlib.Path(args.source);OUT=pathlib.Path(args.out);SAVE=pathlib.Path(args.save)
OUT.mkdir(parents=True,exist_ok=True);SAVE.mkdir(parents=True,exist_ok=True)
if SRC.resolve()==SAVE.resolve():raise ValueError('Use immutable input sources; never accumulate the anatomical transform')

def root_skins(file):
 raw=file.read_bytes();length=struct.unpack_from('<I',raw,12)[0];data=json.loads(raw[20:20+length]);tail=raw[20+length:]
 skinned=[i for i,n in enumerate(data['nodes']) if 'skin' in n]
 for node in data['nodes']:
  if 'children' in node:node['children']=[i for i in node['children'] if i not in skinned]
 for scene in data['scenes']:scene['nodes']=list(dict.fromkeys(scene.get('nodes',[])+skinned))
 data['asset'].setdefault('extras',{})['artStyle']=STYLE
 encoded=json.dumps(data,separators=(',',':')).encode();encoded+=b' '*((-len(encoded))%4)
 file.write_bytes(struct.pack('<III',0x46546C67,2,20+len(encoded)+len(tail))+struct.pack('<II',len(encoded),0x4E4F534A)+encoded+tail)

def preview(id,rig):
 from mathutils import Vector
 pose(rig,True)
 # Diagnostic close view; runtime scene acceptance is performed separately.
 for at,energy,size in [((-3,-4,6),450,5),((3,-3,4),240,4),((0,3,5),240,3)]:
  bpy.ops.object.light_add(type='AREA',location=at);l=bpy.context.object;l.data.energy=energy;l.data.shape='DISK';l.data.size=size;l.rotation_euler=(Vector((0,0,2.1))-l.location).to_track_quat('-Z','Y').to_euler()
 bpy.ops.object.camera_add(location=(.25,-3.8,2.45));cam=bpy.context.object;cam.rotation_euler=(Vector((0,0,2.18))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.lens=65
 scene=bpy.context.scene;scene.camera=cam;scene.render.engine='CYCLES';scene.cycles.samples=16;scene.render.resolution_x=850;scene.render.resolution_y=950;scene.render.resolution_percentage=100;scene.world.color=pigments()['wall'];scene.view_settings.view_transform='AgX';scene.render.filepath=str(OUT/(id+'-diagnostic.png'));bpy.ops.render.render(write_still=True)

for id in args.only.split(','):
 bpy.ops.wm.open_mainfile(filepath=str(SRC/(id+'.blend')))
 rig=bpy.data.objects['SocialCoachRig'];centers=apply_animation_style(id)
 for obj in bpy.context.scene.objects:
  if obj.type=='MESH':
   bm=bmesh.new();bm.from_mesh(obj.data);bmesh.ops.triangulate(bm,faces=list(bm.faces));bm.to_mesh(obj.data);bm.free()
   for face in obj.data.polygons:face.use_smooth=True
 # Existing body clips are unchanged: neck/head rest geometry is consistently
 # transformed while pelvis, limbs, sleeves, posture and navigation stay stable.
 pose(rig);bpy.ops.object.select_all(action='DESELECT')
 for obj in bpy.context.scene.objects:
  if obj.type in ('MESH','ARMATURE'):obj.select_set(True)
 bpy.ops.export_scene.gltf(filepath=str(OUT/(id+'.glb')),export_format='GLB',use_selection=True,export_apply=False,export_animations=True,export_animation_mode='ACTIONS',export_morph=True,export_morph_normal=True,export_tangents=True,export_image_format='AUTO',export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6)
 root_skins(OUT/(id+'.glb'))
 metadata=json.loads((OUT/(id+'.json')).read_text()) if (OUT/(id+'.json')).exists() else {}
 eye=max(c.z for c in centers)*rig.scale.x;drop=rig.data.bones['pelvis'].head_local.z*rig.scale.x-1.06
 metadata.update(id=id,standingEye=round(eye,4),seatedEye=round(eye-drop,4),scale=round(rig.scale.x,4),artStyle=STYLE)
 (OUT/(id+'.json')).write_text(json.dumps(metadata,indent=2)+'\n')
 # Strip old photos from the packed deliverable once nothing references them.
 for images in (bpy.data.images,bpy.data.materials):
  for item in list(images):
   if item.users==0:images.remove(item)
 bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=str(SAVE/(id+'.blend')),compress=True)
 print('ANIMATION CHARACTER',id,metadata,flush=True)
 if args.render:preview(id,rig)
