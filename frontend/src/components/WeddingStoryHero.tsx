"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useLang } from "@/lib/lang";

const COPY = {
  en: {
    aria: "The wedding comes to life",
    eyebrow: "A short wedding story",
    title: "The wedding comes to life.",
    body: "From finding a family that feels right to the moment two people meet at the mandapam. Scroll through the story, or drag the scene to look around.",
    register: "Find your life partner",
    matches: "Explore profiles",
    hint: "↔ Drag to look around · ↓ Scroll to continue",
    chapters: ["The mandapam", "The sacred thali", "Talambralu joy", "Garland exchange", "Together forever"],
  },
  te: {
    aria: "వివాహ వేడుకల కథ",
    eyebrow: "చిన్న వివాహ కథ",
    title: "వివాహ వేడుక మీ ముందే కనిపిస్తుంది.",
    body: "మనసుకు నచ్చిన కుటుంబాన్ని వెతకడం నుంచి మండపంలో రెండు కుటుంబాలు కలిసే క్షణం వరకు. కథను scroll చేయండి లేదా scene ను drag చేసి చూడండి.",
    register: "మీ జీవిత భాగస్వామిని వెతకండి",
    matches: "Profiles చూడండి",
    hint: "↔ చూడటానికి drag చేయండి · ↓ కొనసాగించడానికి scroll చేయండి",
    chapters: ["మండపం", "మంగళసూత్ర వేడుక", "తలంబ్రాల ఆనందం", "పూలమాలల వేడుక", "కలిసి ముందుకు"],
  },
} as const;

export default function WeddingStoryHero() {
  const { lang } = useLang();
  const te = lang === "te";
  const L = te ? COPY.te : COPY.en;
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
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  const chapter = Math.min(L.chapters.length - 1, Math.floor(progress * L.chapters.length));
  // Keep the source frame inside a stable scene box. Progressive scaling made a
  // 16:9 film crop farther on phones and could hide the subject.
  const sceneStyle = { transform: `perspective(1200px) rotateY(${rotation}deg)` };
  return (
    <section ref={ref} className="wedding-story" aria-label={L.aria}>
      <div className="wedding-story__sticky">
        <div
          className="wedding-story__scene"
          style={sceneStyle}
          onPointerDown={(event) => {
            setDragging(true);
            lastX.current = event.clientX;
            (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            if (!dragging) return;
            const delta = event.clientX - lastX.current;
            lastX.current = event.clientX;
            setRotation((value) => Math.max(-16, Math.min(16, value + delta * .16)));
          }}
          onPointerUp={() => setDragging(false)}
          onPointerCancel={() => setDragging(false)}
        >
          {/* Real cinematic wedding film. The poster and dark scene background
              remain visible when autoplay or media loading is unavailable. */}
          <video
            className="wedding-story__film"
            poster="/promo/wedding-story-poster.jpg"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            aria-hidden="true"
          >
            <source src="/promo/wedding-story-film.mp4" type="video/mp4" />
          </video>
          <div className="wedding-story__shade" />
          <div className="wedding-story__glow wedding-story__glow--one" />
          <div className="wedding-story__glow wedding-story__glow--two" />
          <div className="wedding-story__petals" aria-hidden="true">✦　✿　✦　✿　✦</div>
        </div>
        <div className="wedding-story__copy">
          <p className="text-xs font-bold uppercase tracking-[.24em] text-[#f3cf76]">{L.eyebrow}</p>
          <h2 className="mt-2 text-3xl font-bold text-white md:text-5xl">{L.title}</h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/80 md:text-base">{L.body}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/register" className="rounded-full bg-[#f3cf76] px-5 py-3 text-sm font-bold text-[#5c0822]">{L.register}</Link>
            <Link href="/matches" className="rounded-full border border-white/40 px-5 py-3 text-sm font-bold text-white">{L.matches}</Link>
          </div>
          <div className="mt-6 flex items-center gap-3 text-[11px] text-white/70">
            <span className="h-1.5 w-32 overflow-hidden rounded-full bg-white/20"><span className="block h-full rounded-full bg-[#f3cf76] transition-[width] duration-300" style={{ width: `${progress * 100}%` }} /></span>
            <span>{Math.round(progress * 100)}% · {L.chapters[chapter]}</span>
          </div>
        </div>
        <div className="wedding-story__hint">{L.hint}</div>
      </div>
    </section>
  );
}
