/** Raster portraits only. Never load a URL from persisted practice state. */
export const MAX_AVATAR_DATA=120_000;
export function validAvatarImage(value:unknown):value is string {
 if(typeof value!=='string'||value.length>MAX_AVATAR_DATA)return false;
 return /^data:image\/webp;base64,UklGR[A-Za-z0-9+/]*={0,2}$/.test(value)||/^data:image\/jpeg;base64,\/9j\/[A-Za-z0-9+/]*={0,2}$/.test(value);
}
export type AvatarCrop={zoom:number;x:number;y:number};
export function squareCrop(width:number,height:number,crop:AvatarCrop){
 if(!Number.isFinite(width)||!Number.isFinite(height)||width<1||height<1)throw new Error('Invalid image dimensions');
 const zoom=Number.isFinite(crop.zoom)?Math.max(1,Math.min(3,crop.zoom)):1;
 const x=Number.isFinite(crop.x)?Math.max(-1,Math.min(1,crop.x)):0,y=Number.isFinite(crop.y)?Math.max(-1,Math.min(1,crop.y)):0;
 const size=Math.min(width,height)/zoom;
 return {x:(width-size)*(1+x)/2,y:(height-size)*(1+y)/2,size};
}
export type AvatarSource={image:CanvasImageSource;width:number;height:number;dispose:()=>void};
export async function readAvatarFile(file:File):Promise<AvatarSource>{
 if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>8*1024*1024||!file.size)throw new Error('avatar-file');
 const url=URL.createObjectURL(file),image=new Image();
 try{
  image.decoding='async';image.src=url;await image.decode();
  if(!image.naturalWidth||!image.naturalHeight||image.naturalWidth*image.naturalHeight>24_000_000)throw new Error('avatar-dimensions');
  return {image,width:image.naturalWidth,height:image.naturalHeight,dispose:()=>{image.src='';}};
 }catch(error){image.src='';throw error;}finally{URL.revokeObjectURL(url);}
}
export function drawAvatar(canvas:HTMLCanvasElement,source:AvatarSource,crop:AvatarCrop){
 const context=canvas.getContext('2d');if(!context)throw new Error('avatar-canvas');
 const rect=squareCrop(source.width,source.height,crop);
 context.clearRect(0,0,canvas.width,canvas.height);context.drawImage(source.image,rect.x,rect.y,rect.size,rect.size,0,0,canvas.width,canvas.height);
}
export function encodeAvatar(canvas:HTMLCanvasElement){
 // Canvas re-encoding drops the original EXIF, filenames and other metadata.
 let image=canvas.toDataURL('image/webp',.82);
 if(!validAvatarImage(image))image=canvas.toDataURL('image/jpeg',.78);
 if(!validAvatarImage(image))throw new Error('avatar-encoding');
 return image;
}
