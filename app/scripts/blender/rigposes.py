"""Named anatomical poses shared by the body and first-person arm exports."""
import bpy,math
from mathutils import Matrix,Quaternion,Vector

def delta(rig,name,axis,angle):
 bone=rig.pose.bones[name];rest=bone.bone.matrix_local.to_quaternion()
 bone.rotation_mode='QUATERNION';bone.rotation_quaternion=rest.inverted()@Quaternion(axis,angle)@rest

def aim(rig,name,direction):
 bone=rig.pose.bones[name];current=bone.tail-bone.head
 swing=current.rotation_difference(Vector(direction));rotation=swing@bone.matrix.to_quaternion()
 bone.matrix=Matrix.Translation(bone.head)@rotation.to_matrix().to_4x4();bpy.context.view_layer.update()

def pose(rig,seated=False,kind='idle'):
 if rig.animation_data:
  rig.animation_data.action=None
  for track in rig.animation_data.nla_tracks:track.mute=True
 for bone in rig.pose.bones:bone.rotation_mode='QUATERNION';bone.rotation_quaternion=Quaternion();bone.location=(0,0,0)
 bpy.context.view_layer.update()
 if seated:
  pelvis=rig.pose.bones['pelvis'];matrix=pelvis.matrix.copy();matrix.translation.z=1.06/rig.scale.x;pelvis.matrix=matrix;bpy.context.view_layer.update()
  for side,sign in [('l',1),('r',-1)]:
   # Keep the chair pelvis height while solving each actor's leg length to
   # the original shoe-floor contact; fixed knee angles leave shorter feet floating.
   thigh=rig.pose.bones['thigh_'+side];calf=rig.data.bones['calf_'+side];foot=rig.data.bones['foot_'+side]
   knee_z=foot.head_local.z+calf.length
   vertical=max(-.9,min(.9,(knee_z-thigh.head.z)/thigh.length))
   forward=math.sqrt(1-vertical*vertical-.025**2)
   aim(rig,'thigh_'+side,(sign*.025,-forward,vertical))
   aim(rig,'calf_'+side,(0,0,-1));aim(rig,'foot_'+side,foot.tail_local-foot.head_local)
 for side,sign in [('l',1),('r',-1)]:
  aim(rig,'upperarm_'+side,(sign*.10,-.06,-1))
  aim(rig,'lowerarm_'+side,(sign*.04,-1,-.12) if seated else (sign*.04,-.10,-1))
  aim(rig,'hand_'+side,(sign*.04,-1,-.08) if seated else (sign*.04,-.40,-1))
 if kind in ('toast','phone'):
  aim(rig,'upperarm_r',(-.17,-.36,-1));aim(rig,'lowerarm_r',(0,-.45,1));aim(rig,'hand_r',(0,-.3,1))
  for finger in ('index','middle','ring','pinky'):
   for joint in (1,2,3):
    bone=rig.pose.bones[f'{finger}_{joint:02}_r'];bone.rotation_quaternion=Quaternion((1,0,0),.60 if joint==1 else .80)
 if kind=='fold':
  for side,sign in [('l',1),('r',-1)]:
   aim(rig,'upperarm_'+side,(sign*.16,-.5,-1))
   aim(rig,'lowerarm_'+side,(-sign,-.4,.34 if side=='l' else .17))
   aim(rig,'hand_'+side,(-sign,-.24,.16))
 if kind=='lean':delta(rig,'spine_01',(1,0,0),.16)
 if kind=='palm':
  aim(rig,'upperarm_l',(.2,-.45,-1));aim(rig,'lowerarm_l',(.1,-1,.65));aim(rig,'hand_l',(.1,-1,.5))
 bpy.context.view_layer.update()
