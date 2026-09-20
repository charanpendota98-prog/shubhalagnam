"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const CHAPTERS = ["The mandapam", "A meeting begins", "Two families", "Garland exchange", "Together" ];

export default function WeddingStoryHero() {
  const ref = useRef<HTMLElement>(null);
  const [progress, setProgress] = useState(0);
  const [rotation, setRotation] = useState(0);
  const [dragging, setDragging] = useState(false);
  const lastX = useRef(0);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const range = Math.max(1, rect.height - window.innerHeight);
      setProgress(Math.max(0, Math.min(1, -rect.top / range)));
      frame = 0;
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update(); window.addEventListener("scroll", onScroll, { passive: true }); window.addEventListener("resize", onScroll);
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); if (frame) cancelAnimationFrame(frame); };
  }, []);

  const chapter = Math.min(CHAPTERS.length - 1, Math.floor(progress * CHAPTERS.length));
  const sceneStyle = { transform: `perspective(1200px) rotateY(${rotation}deg) scale(${1.04 + progress * .04})` };
  return <section ref={ref} className="wedding-story" aria-label="The wedding comes to life">
    <div className="wedding-story__sticky">
      <div className="wedding-story__scene" role="img" aria-label="Animated wedding mandapam scene" style={sceneStyle} onPointerDown={e => { setDragging(true); lastX.current = e.clientX; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); }} onPointerMove={e => { if (!dragging) return; const delta = e.clientX - lastX.current; lastX.current = e.clientX; setRotation(r => Math.max(-16, Math.min(16, r + delta * .16))); }} onPointerUp={() => setDragging(false)} onPointerCancel={() => setDragging(false)}>
        <div className="wedding-story__image" />
        <div className="wedding-story__shade" />
        <div className="wedding-story__glow wedding-story__glow--one" />
        <div className="wedding-story__glow wedding-story__glow--two" />
        <div className="wedding-story__mandapam" aria-hidden="true"><span className="pillar pillar--left" /><span className="pillar pillar--right" /><span className="roof" /><span className="fire">✦</span></div>
        <div className={`wedding-story__couple wedding-story__couple--${chapter}`} aria-hidden="true"><span className="bride">👰🏽</span><span className="groom">🤵🏽</span><span className="garland">✿</span></div>
        <div className="wedding-story__petals" aria-hidden="true">✦　✿　✦　✿　✦</div>
      </div>
      <div className="wedding-story__copy">
        <p className="text-xs font-bold uppercase tracking-[.24em] text-[#f3cf76]">A short wedding story</p>
        <h2 className="mt-2 text-3xl font-bold text-white md:text-5xl">The wedding comes to life.</h2>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/80 md:text-base">From finding a family that feels right to the moment two people meet at the mandapam. Scroll through the story, or drag the scene to look around.</p>
        <div className="mt-5 flex flex-wrap gap-3"><Link href="/register" className="rounded-full bg-[#f3cf76] px-5 py-3 text-sm font-bold text-[#5c0822]">Find your life partner</Link><Link href="/matches" className="rounded-full border border-white/40 px-5 py-3 text-sm font-bold text-white">Explore profiles</Link></div>
        <div className="mt-6 flex items-center gap-3 text-[11px] text-white/70"><span className="h-1.5 w-32 overflow-hidden rounded-full bg-white/20"><span className="block h-full rounded-full bg-[#f3cf76] transition-[width] duration-300" style={{ width: `${progress * 100}%` }} /></span><span>{Math.round(progress * 100)}% · {CHAPTERS[chapter]}</span></div>
      </div>
      <div className="wedding-story__hint">↔ Drag to look around · ↓ Scroll to continue</div>
    </div>
  </section>;
}
