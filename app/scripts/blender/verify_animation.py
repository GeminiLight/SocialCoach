"""Check actual eye/lid contact and connected deformation in packed sources."""
import argparse,bpy,json,pathlib,sys
from mathutils import Vector
from mathutils.bvhtree import BVHTree
sys.path.insert(0,str(pathlib.Path(__file__).parent));from rigposes import pose
argv=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
p=argparse.ArgumentParser();p.add_argument('--source',required=True);p.add_argument('--report',required=True);p.add_argument('--only',default='chen,lin,zhou,aunt,mom,dad,senior,yue,kai,fang,qiao,cheng,he,ning,rui,player');args=p.parse_args(argv)
rows=[];failures=[]
for id in args.only.split(','):
 bpy.ops.wm.open_mainfile(filepath=str(pathlib.Path(args.source)/(id+'.blend')))
 rig=bpy.data.objects['SocialCoachRig'];skin=bpy.data.objects['skin'];eyes=bpy.data.objects['eyes'];pose(rig)
 keys=skin.data.shape_keys.key_blocks
 for key in list(keys)[1:]:key.value=0
 # Basis must agree with raw positions before portable triangulation/export.
 mismatch=max((v.co-keys[0].data[i].co).length for i,v in enumerate(skin.data.vertices))
 if mismatch>1e-5:failures.append(f'{id}: mesh/Basis mismatch {mismatch}')
 samples=[]
 for closed in (False,True):
  keys['blink'].value=1 if closed else 0;bpy.context.view_layer.update()
  deps=bpy.context.evaluated_depsgraph_get();evaluated=skin.evaluated_get(deps);data=evaluated.to_mesh()
  bvh=BVHTree.FromPolygons([evaluated.matrix_world@v.co for v in data.vertices],[p.vertices[:] for p in data.polygons]);evaluated.to_mesh_clear()
  eye_eval=eyes.evaluated_get(deps);edata=eye_eval.to_mesh()
  for sign in (-1,1):
   vs=[eye_eval.matrix_world@v.co for v in edata.vertices if v.co.x*sign>0]
   center=Vector(tuple((min(v[i] for v in vs)+max(v[i] for v in vs))/2 for i in range(3)));front=min(v.y for v in vs)
   hit=bvh.ray_cast(Vector((center.x,front-1,center.z)),Vector((0,1,0)),2)[0]
   covered=bool(hit and hit.y<=front+.004*rig.scale.x)
   samples.append(dict(closed=closed,side=sign,covered=covered,lidY=round(hit.y,5) if hit else None,eyeY=round(front,5)))
   if closed and not covered:failures.append(f'{id}: closed lid does not cover iris on side {sign}')
   if not closed and covered:failures.append(f'{id}: neutral lid hides iris on side {sign}')
  eye_eval.to_mesh_clear()
 keys['blink'].value=0
 rows.append(dict(actor=id,meshBasisError=mismatch,eyes=samples))
pathlib.Path(args.report).write_text(json.dumps(dict(actors=rows,failures=failures),indent=2)+'\n')
print('CHECKED',len(rows),'actors',len(failures),'failures')
for failure in failures:print(failure)
if failures:raise RuntimeError('Eye/eyelid contact failed; inspect actual meshes before shipping')
