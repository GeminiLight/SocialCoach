/** Stable casting, separate from scene text: changing tables must change people. */
export type CastAppearance = {
  feminine:boolean; age:'young'|'adult'|'mature';
  build:[width:number,height:number,depth:number];
  skin:'skin'|'skinWarm'|'skinMature'; hairPigment:'hair'|'hairGray';
  face:{width:number;jaw:number;cheek:number;temple:number;eye:number;nose:number;mouth:number;brow:number;part:number;eyeWidth:number;eyeHeight:number};
  hair:{fringe:number;nape:number;volume:number;sweep:number;wave:number;tail?:'bun'|'pony'};
  glasses:'metal'|'rectangle'|'round'; energy:number; restTilt:number;
};
const base:CastAppearance={feminine:false,age:'adult',build:[1,1,1],skin:'skinWarm',hairPigment:'hair',face:{width:1,jaw:1,cheek:1,temple:1,eye:.105,nose:1,mouth:1,brow:0,part:0,eyeWidth:.055,eyeHeight:.020},hair:{fringe:.19,nape:-.08,volume:.012,sweep:.01,wave:.0025},glasses:'rectangle',energy:1,restTilt:0};
const person=(v:Partial<Omit<CastAppearance,'face'|'hair'>>&{face?:Partial<CastAppearance['face']>;hair?:Partial<CastAppearance['hair']>}):CastAppearance=>({...base,...v,face:{...base.face,...v.face},hair:{...base.hair,...v.hair}});
export const castAppearances:Record<string,CastAppearance>={
  chen:person({energy:0.75,restTilt:0,age:'mature',build:[1.10,1.04,1.07],face:{width:1.09,jaw:1.16,cheek:1.01,eye:.112,nose:1.13,mouth:1.08,brow:-.005,part:-.055,eyeHeight:.016},hair:{fringe:.26,nape:-.05,volume:.012,sweep:.035},glasses:'metal'}),
  lin:person({energy:0.8,restTilt:-0.009,feminine:true,build:[.96,1.02,.94],skin:'skin',face:{width:.92,jaw:.94,cheek:.96,temple:1.03,eye:.101,nose:.90,mouth:1.04,brow:.005,part:.045},hair:{fringe:.235,nape:-.10,volume:.013,sweep:.022,tail:'bun'}}),
  zhou:person({energy:0.72,restTilt:0.012,age:'young',build:[.91,1.03,.91],face:{width:.91,jaw:.93,eye:.100,nose:.94,mouth:.94,brow:.003,eyeWidth:.051,eyeHeight:.018},hair:{fringe:.18,nape:-.035,volume:.009,sweep:.008},glasses:'rectangle'}),
  aunt:person({energy:1.0,restTilt:-0.015,feminine:true,age:'mature',build:[1.10,.96,1.10],skin:'skinMature',face:{width:1.065,jaw:1.07,cheek:1.08,eye:.109,nose:1.02,mouth:1.08,brow:-.003,part:-.028,eyeHeight:.016},hair:{fringe:.205,nape:-.26,volume:.045,sweep:.02,wave:.009}}),
  mom:person({energy:0.65,restTilt:0.01,feminine:true,age:'mature',build:[.98,.94,1.01],skin:'skinMature',face:{width:.965,jaw:1.01,cheek:1.035,temple:.98,eye:.098,nose:.92,mouth:.94,brow:.007,part:.047,eyeHeight:.016},hair:{fringe:.23,nape:-.09,volume:.018,sweep:.025,wave:.004}}),
  dad:person({energy:0.6,restTilt:-0.005,age:'mature',build:[1.04,1,1.06],skin:'skinMature',hairPigment:'hairGray',face:{width:1.045,jaw:1.11,cheek:.97,eye:.108,nose:1.10,mouth:1.03,brow:-.004,part:-.025,eyeWidth:.052,eyeHeight:.015},hair:{fringe:.30,nape:-.015,volume:.007,sweep:.012},glasses:'metal'}),
  senior:person({energy:1.1,restTilt:0.005,age:'young',build:[1.01,1.06,.98],face:{width:1.005,jaw:1.10,cheek:.95,eye:.107,nose:1.0,mouth:1.03,brow:-.001,part:-.04,eyeHeight:.021},hair:{fringe:.165,nape:-.06,volume:.025,sweep:.028,wave:.006}}),
  yue:person({energy:0.9,restTilt:-0.014,feminine:true,age:'young',build:[.89,.96,.90],skin:'skin',face:{width:.90,jaw:.88,cheek:1.06,eye:.098,nose:.86,mouth:.98,brow:.008,part:-.034,eyeWidth:.058,eyeHeight:.023},hair:{fringe:.22,nape:-.10,volume:.016,sweep:.014,tail:'pony'}}),
  kai:person({energy:0.7,restTilt:0.011,age:'young',build:[.98,1.01,1.01],face:{width:1.0,jaw:1.02,cheek:1.02,eye:.105,nose:.94,mouth:.96,brow:.002,part:.018,eyeHeight:.019},hair:{fringe:.145,nape:-.06,volume:.023,sweep:.004,wave:.005},glasses:'round'}),
};
export const castAppearance=(id:string)=>castAppearances[id]??base;
/** Torso scaling is around the hips; chair and foot anchors remain unchanged. */
export const castEyeHeight=(id:string,seated:boolean)=>(seated?1.32:1.72)+(1.11+.023*.72)*castAppearance(id).build[1];
