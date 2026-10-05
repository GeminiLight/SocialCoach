"""Export first-person arms from the same anatomical player source, never a
separate primitive hand. Requires player.blend from build_characters.py.
"""
import argparse,bmesh,bpy,pathlib,sys
from mathutils import Vector
sys.path.insert(0,str(pathlib.Path(__file__).parent));from rigposes import pose
argv=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
p=argparse.ArgumentParser();p.add_argument('--source',required=True);p.add_argument('--out',required=True);args=p.parse_args(argv)
OUT=pathlib.Path(args.out);OUT.mkdir(parents=True,exist_ok=True)
for kind,side in [('grip','r'),('open','l')]:
 bpy.ops.wm.open_mainfile(filepath=args.source)
 rig=bpy.data.objects['SocialCoachRig'];pose(rig,False,'toast' if kind=='grip' else 'palm')
 wrist=rig.matrix_world@rig.pose.bones['hand_'+side].head;deps=bpy.context.evaluated_depsgraph_get();exports=[]
 for source in list(bpy.context.scene.objects):
  if source.type!='MESH' or not any(mod.type=='ARMATURE' for mod in source.modifiers):continue
  allowed={g.index for g in source.vertex_groups if g.name.endswith('_'+side) and g.name.split('_')[0] in ('lowerarm','hand','index','middle','ring','pinky','thumb')}
  selected={v.index for v in source.data.vertices if sum(g.weight for g in v.groups if g.group in allowed)>.25}
  if not selected:continue
  evaluated=source.evaluated_get(deps);mesh=bpy.data.meshes.new_from_object(evaluated,preserve_all_data_layers=True,depsgraph=deps)
  if len(mesh.vertices)!=len(source.data.vertices):raise RuntimeError('Unexpected topology-changing modifier')
  for vertex in mesh.vertices:vertex.co=source.matrix_world@vertex.co-wrist
  bm=bmesh.new();bm.from_mesh(mesh);bm.verts.ensure_lookup_table();bmesh.ops.delete(bm,geom=[v for v in bm.verts if v.index not in selected],context='VERTS');bm.to_mesh(mesh);bm.free()
  obj=bpy.data.objects.new('Player '+kind+' '+source.name,mesh);bpy.context.collection.objects.link(obj);exports.append(obj)
 bpy.ops.object.select_all(action='DESELECT')
 for obj in exports:obj.select_set(True)
 bpy.ops.export_scene.gltf(filepath=str(OUT/('hand-'+kind+'.glb')),export_format='GLB',use_selection=True,export_animations=False,export_skins=False,export_morph=False,export_tangents=True,export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6)
 print('EXPORTED HAND',kind,flush=True)
