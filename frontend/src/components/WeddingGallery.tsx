"use client";
import Image from "next/image";
import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLang } from "@/lib/lang";
const photos = [
  {src:"/editorial/mana-wedding-details-new.webp",alt:"Brass wedding lamp, flowers and silk in a wedding setting"},
  {src:"/editorial/mana-jasmine-new.webp",alt:"Jasmine garlands and wine-red wedding silk"},
  {src:"/editorial/mana-courtyard-new.webp",alt:"Flower-decorated South Indian wedding courtyard"},
];
export default function WeddingGallery(){
 const te=useLang().lang==="te";const track=useRef<HTMLDivElement>(null);const [active,setActive]=useState(0);
 function go(i:number){const el=track.current;if(!el)return;const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;el.scrollTo({left:i*el.clientWidth,behavior:reduced?'instant':'smooth'});}
 return <section className="wedding-editorial__photo wedding-gallery" aria-label={te?"Wedding gallery":"Wedding gallery"} aria-roledescription="carousel">
  <div className="wedding-gallery__track" ref={track} tabIndex={0} aria-label="Wedding photos. Swipe or use left and right arrow keys." onScroll={()=>{const el=track.current;if(el)setActive(Math.round(el.scrollLeft/el.clientWidth))}} onKeyDown={e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();go(Math.max(0,Math.min(photos.length-1,active+(e.key==='ArrowRight'?1:-1))))}}}>
   {photos.map((photo,i)=><div className="wedding-gallery__slide" key={photo.src} role="group" aria-roledescription="slide" aria-label={`${i+1} of ${photos.length}`}><Image unoptimized src={photo.src} width={1536} height={1024} alt={photo.alt} loading={i===0?'eager':'lazy'} fetchPriority={i===0?'high':'auto'}/></div>)}
  </div>
  <div className="wedding-gallery__controls"><div><span className="wedding-gallery__eyebrow">WEDDING GALLERY</span><p>{te?"ఒక అందమైన ఆరంభం.":"A beautiful beginning."}</p></div><div className="wedding-gallery__nav"><button type="button" aria-label="Previous wedding photo" disabled={active===0} onClick={()=>go(active-1)}><ChevronLeft size={20}/></button><span aria-live="polite" aria-atomic="true">{String(active+1).padStart(2,'0')} / 03</span><button type="button" aria-label="Next wedding photo" disabled={active===photos.length-1} onClick={()=>go(active+1)}><ChevronRight size={20}/></button></div></div>
 </section>
}
