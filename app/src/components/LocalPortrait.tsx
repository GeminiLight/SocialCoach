'use client';
import {useState,type ReactNode} from 'react';

/** Corrupt imported raster data still leaves the selected local portrait usable. */
export function LocalPortrait({imageData,size,className,fallback}:{imageData:string;size:number;className?:string;fallback:ReactNode}){
 const [failed,setFailed]=useState(false);
 if(failed)return fallback;
 return <span className={`avatar-portrait inline-block shrink-0 overflow-hidden rounded-full align-middle${className?` ${className}`:''}`} style={{width:size,height:size}}>
  {/* eslint-disable-next-line @next/next/no-img-element -- local raster data only, never sent to an image optimizer */}
  <img src={imageData} width={size} height={size} alt="" className="h-full w-full object-cover" onError={()=>setFailed(true)}/>
 </span>;
}
