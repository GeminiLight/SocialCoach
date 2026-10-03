import { AnimationMixer, Euler, Quaternion, type AnimationClip, type Bone, type Object3D } from 'three';

/** Mixers are reusable across React's setup/cleanup/setup cycle. Uncaching while
 * retaining AnimationAction objects leaves invalid property bindings. */
export function createPoseMixer(scene:Object3D,clips:AnimationClip[]) {
  const mixer=new AnimationMixer(scene);
  const actions=Object.fromEntries(clips.map(clip=>{const action=mixer.clipAction(clip);action.setEffectiveWeight(0);return [clip.name,action];}));
  return {mixer,actions,start:()=>{Object.values(actions).forEach(action=>action.play());},stop:()=>mixer.stopAllAction()};
}
/** Undo only our display deltas before the next animation sample. Copying the
 * bind pose here breaks constant clips: Three skips writing unchanged values. */
export function undoPresentation(bones:Record<string,Bone>,previous:Record<string,Quaternion>) {
  for(const [name,delta] of Object.entries(previous)){bones[name].quaternion.multiply(delta.invert());delta.identity();}
}
export function presentationTurn(bone:Bone|undefined,previous:Record<string,Quaternion>,scratch:{delta:Quaternion;euler:Euler},x:number,y:number,z=0) {
  if(!bone)return;
  scratch.delta.setFromEuler(scratch.euler.set(x,y,z));bone.quaternion.multiply(scratch.delta);previous[bone.name].multiply(scratch.delta);
}
