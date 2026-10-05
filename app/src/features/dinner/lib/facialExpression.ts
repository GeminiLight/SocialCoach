import type { Emotion } from './content';

/** Small, readable adult expressions. Speaking/eyes are driven separately;
 * visual emphasis never changes the NPC's stance or becomes report evidence. */
export function facialExpression(emotion:Emotion='neutral') {
  const expressions={
    neutral:{browInnerUp:0,browDown:0,mouthPress:0,smile:0},
    pressing:{browInnerUp:0,browDown:.30,mouthPress:.25,smile:0},
    annoyed:{browInnerUp:0,browDown:.65,mouthPress:.60,smile:0},
    thinking:{browInnerUp:.28,browDown:0,mouthPress:.20,smile:0},
    supportive:{browInnerUp:.10,browDown:0,mouthPress:0,smile:.32},
  } satisfies Record<Emotion,{browInnerUp:number;browDown:number;mouthPress:number;smile:number}>;
  return expressions[emotion];
}
