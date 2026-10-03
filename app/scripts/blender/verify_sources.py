"""Check anatomical contact on the actual deformed source meshes, not rig helpers."""
import argparse,bpy,json,pathlib,sys
sys.path.insert(0,str(pathlib.Path(__file__).parent))
from rigposes import pose
argv=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
p=argparse.ArgumentParser();p.add_argument('--asset-root',required=True);p.add_argument('--report',required=True);args=p.parse_args(argv)
rows=[]
for source in sorted(pathlib.Path(args.asset_root).glob('*.blend')):
 if source.stem not in ['chen','lin','zhou','aunt','mom','dad','senior','yue','kai','fang','qiao','cheng','he','ning','rui','player']:continue
 bpy.ops.wm.open_mainfile(filepath=str(source));rig=bpy.data.objects['SocialCoachRig']
 for seated in (False,True):
  pose(rig,seated);feet={}
  for shoe in [o for o in bpy.data.objects if o.type=='MESH' and any(m and m.name.startswith('shoes') for m in o.data.materials)]:
   obj=shoe.evaluated_get(bpy.context.evaluated_depsgraph_get());mesh=obj.to_mesh()
   for side,sign in [('left',1),('right',-1)]:
    heights=[(obj.matrix_world@v.co).z for v in mesh.vertices if v.co.x*sign>0]
    feet[side]=round(min(heights),5)
   obj.to_mesh_clear()
  if set(feet)!=set(['left','right']) or any(abs(height)>.04 for height in feet.values()):raise RuntimeError(f'{source.stem} {seated}: foot contact {feet}')
  rows.append(dict(actor=source.stem,seated=seated,soleHeight=feet))
pathlib.Path(args.report).write_text(json.dumps(dict(blender=bpy.app.version_string,contact=rows),indent=2)+'\n')
print('VERIFIED',len(rows),'standing / seated pairs')
