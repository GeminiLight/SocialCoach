/** Hysteresis keeps occasional stalls from making image quality oscillate. */
export function nextPixelRatio(current:number,fps:number,cap:number) {
  if(current>cap)return cap;
  if(fps<42)return Math.max(.75,Math.round(current*.8*100)/100);
  if(fps>57)return Math.min(cap,Math.round((current+.1)*100)/100);
  return current;
}
