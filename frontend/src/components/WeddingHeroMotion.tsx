"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { useLang } from "@/lib/lang";

type Connection = EventTarget & { saveData?: boolean; effectiveType?: string };
const scenes = [
  { name: "hands", alt: "Newlywed hands together, jasmine garlands and red wedding silk" },
  { name: "lamps", alt: "A brass wedding lamp glowing beside flowers and silk" },
];

/** Original commissioned wedding artwork, animated into silent, local video loops. */
export default function WeddingHeroMotion() {
  const te = useLang().lang === "te";
  const root = useRef<HTMLElement>(null);
  const videos = useRef<(HTMLVideoElement | null)[]>([]);
  const [allowed, setAllowed] = useState(false);
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(false);
  const [paused, setPaused] = useState(false);
  const [playing, setPlaying] = useState(false);
  const shouldPlay = useRef(false);
  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const connection = (navigator as Navigator & { connection?: Connection }).connection;
    const update = () => setAllowed(!motion.matches && !connection?.saveData && !["slow-2g", "2g", "3g"].includes(connection?.effectiveType || ""));
    update();
    motion.addEventListener("change", update);
    connection?.addEventListener("change", update);
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.05 });
    if (root.current) observer.observe(root.current);
    return () => { motion.removeEventListener("change", update); connection?.removeEventListener("change", update); observer.disconnect(); };
  }, []);
  useEffect(() => {
    if (!allowed || !visible) return;
    const idle = window.setTimeout(() => setReady(true), 1200);
    return () => window.clearTimeout(idle);
  }, [allowed, visible]);
  useEffect(() => {
    const update = () => {
      const run = allowed && ready && visible && !paused && !document.hidden;
      shouldPlay.current = run;
      setPlaying(run);
      videos.current.forEach(video => { if (!video) return; if (run) void video.play().catch(() => setPlaying(false)); else video.pause(); });
    };
    update(); document.addEventListener("visibilitychange", update);
    return () => { shouldPlay.current = false; document.removeEventListener("visibilitychange", update); videos.current.forEach(video => video?.pause()); };
  }, [allowed, ready, visible, paused]);
  return <aside className="wedding-motion" ref={root} aria-label={te ? "వివాహ దృశ్యాలు" : "Wedding scenes"}>
    <div className="wedding-motion__halo" aria-hidden="true" />
    {scenes.map((scene, index) => <div className={`wedding-motion__scene wedding-motion__scene--${index + 1}`} key={scene.name}>
      <Image unoptimized src={`/editorial/mana-motion-${scene.name}.webp`} width={index === 0 ? 576 : 480} height={index === 0 ? 432 : 360} alt={scene.alt} loading={index === 0 ? "eager" : "lazy"} fetchPriority={index === 0 ? "high" : "auto"} />
      {allowed && ready && <video ref={element => { videos.current[index] = element; }} src={`/editorial/mana-motion-${scene.name}.mp4`} muted playsInline loop preload="none" aria-hidden="true" tabIndex={-1} onCanPlay={event => { if (shouldPlay.current) void event.currentTarget.play().catch(() => setPlaying(false)); }} />}
    </div>)}
    <div className="wedding-motion__caption"><span>MANA VIVAHA</span><p>{te ? "కలిసి, ఒక అందమైన ఆరంభం." : "A little moment. A beautiful beginning."}</p></div>
    {allowed && ready && <button className="wedding-motion__toggle" type="button" aria-label={te ? (paused ? "దృశ్యాలను కదిలించండి" : "దృశ్యాలను ఆపండి") : (paused ? "Play wedding motion" : "Pause wedding motion")} aria-pressed={paused} onClick={() => setPaused(value => !value)}>{paused || !playing ? <Play size={15} aria-hidden="true" /> : <Pause size={15} aria-hidden="true" />}<span>{te ? (paused ? "కదిలించండి" : "ఆపండి") : (paused ? "Play" : "Pause")}</span></button>}
  </aside>;
}
