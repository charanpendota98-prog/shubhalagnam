"use client";

/**
 * 👑 MANA VIVAHA — RESPONSIVE CINEMATIC WEDDING HERO
 * ===================================================
 * • Local decorative wedding film with an optimized poster fallback.
 * • Clear bilingual brand, concise headline, and touch-friendly actions.
 * • Responsive typography and spacing for phone through desktop widths.
 */

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef } from "react";
import { useLang, type Lang } from "@/lib/lang";
import HomeMatchSearch from "@/components/HomeMatchSearch";


const COPY = {
  te: {
    kicker: "తెలుగు కుటుంబాల కోసం · Mana Vivaha · మన వివాహ",
    titleA: "మీ వివాహ ప్రయాణం,",
    titleB: "ఇక్కడ మొదలవుతుంది",
    pricePill: "₹99 నుంచి · మొదటి 3 interest requests ఉచితం",
    ctaReg: "ఉచిత ప్రొఫైల్ సృష్టించండి",
  },
  en: {
    kicker: "For Telugu families · Mana Vivaha · మన వివాహ",
    titleA: "Your Telugu matrimony journey",
    titleB: "starts here.",
    pricePill: "From ₹99 · first 3 interest requests are free",
    ctaReg: "Create your free profile",
  },
};

export default function CinematicHero() {
  const { lang } = useLang();
  const L = COPY[(lang as Lang) in COPY ? (lang as Lang) : "te"];
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Keep the wedding film decorative: only play it when it is visible and
  // motion is allowed. A static, optimized poster remains available otherwise.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const smallScreen = window.matchMedia("(max-width: 767px)");
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    let isVisible = !("IntersectionObserver" in window);
    let disposed = false;

    const syncPlayback = () => {
      if (disposed || reducedMotion.matches || smallScreen.matches || connection?.saveData
          || document.visibilityState !== "visible" || !isVisible) {
        video.pause();
        return;
      }
      if (video.readyState === HTMLMediaElement.HAVE_NOTHING) video.load();
      void video.play().catch(() => {
        // Autoplay can be blocked by browser policy; the optimized poster is the fallback.
      });
    };

    const observer = "IntersectionObserver" in window
      ? new IntersectionObserver(([entry]) => {
          isVisible = !!entry?.isIntersecting;
          syncPlayback();
        }, { threshold: 0.05 })
      : null;
    observer?.observe(video);
    reducedMotion.addEventListener("change", syncPlayback);
    smallScreen.addEventListener("change", syncPlayback);
    document.addEventListener("visibilitychange", syncPlayback);
    syncPlayback();

    return () => {
      disposed = true;
      observer?.disconnect();
      reducedMotion.removeEventListener("change", syncPlayback);
      smallScreen.removeEventListener("change", syncPlayback);
      document.removeEventListener("visibilitychange", syncPlayback);
      video.pause();
    };
  }, []);

  // The canvas is a purely decorative effect. Avoid its animation on small
  // screens, when the hero is off-screen, or when reduced motion is requested.
  useEffect(() => {
    const canvas = canvasRef.current;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (!canvas || reducedMotion.matches || connection?.saveData || window.innerWidth < 768) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let frameId = 0;
    let visible = !("IntersectionObserver" in window);
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);
    const particles = Array.from({ length: 14 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 2 + 1,
      speedY: Math.random() * 0.6 + 0.2,
      speedX: Math.random() * 0.3 - 0.15,
      opacity: Math.random() * 0.45 + 0.2,
      color: Math.random() > 0.4 ? "#F59E0B" : "#FDE047",
    }));

    const stop = () => {
      if (frameId) cancelAnimationFrame(frameId);
      frameId = 0;
    };
    const shouldAnimate = () =>
      visible && !reducedMotion.matches && !connection?.saveData
      && document.visibilityState === "visible" && window.innerWidth >= 768;
    const render = () => {
      frameId = 0;
      if (!shouldAnimate()) return;
      ctx.clearRect(0, 0, width, height);
      particles.forEach((particle) => {
        particle.y += particle.speedY;
        particle.x += particle.speedX;
        if (particle.y > height) {
          particle.y = -10;
          particle.x = Math.random() * width;
        }
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = particle.color;
        ctx.globalAlpha = particle.opacity;
        ctx.shadowBlur = 5;
        ctx.shadowColor = "#F59E0B";
        ctx.fill();
      });
      frameId = requestAnimationFrame(render);
    };
    const start = () => {
      if (shouldAnimate() && !frameId) frameId = requestAnimationFrame(render);
      else if (!shouldAnimate()) stop();
    };
    const resize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      start();
    };
    const observer = "IntersectionObserver" in window
      ? new IntersectionObserver(([entry]) => {
          visible = !!entry?.isIntersecting;
          start();
        })
      : null;
    observer?.observe(canvas);
    window.addEventListener("resize", resize, { passive: true });
    document.addEventListener("visibilitychange", start);
    reducedMotion.addEventListener("change", start);
    start();

    return () => {
      stop();
      observer?.disconnect();
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", start);
      reducedMotion.removeEventListener("change", start);
    };
  }, []);

  return (
    <section
      className="cinematic-hero relative min-h-[600px] sm:min-h-[680px] lg:min-h-[720px] flex items-center overflow-hidden bg-gradient-to-br from-[#5b0e32] via-[#cf5a42] to-[#0f766e] text-white"
      aria-label={lang === "te" ? "మన వివాహ — తెలుగు వివాహ పరిచయ వేదిక" : "Mana Vivaha — Telugu matrimony"}
    >
      {/* ================= 1. LOCAL CINEMATIC WEDDING FILM BACKGROUND ================= */}
      <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
        <Image
          src="/promo/hero-bg-ultra.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="hero-poster object-cover object-[62%_center] sm:object-center"
        />
        <video
          ref={videoRef}
          poster="/promo/hero-bg-ultra.jpg"
          loop
          muted
          playsInline
          preload="none"
          disablePictureInPicture
          aria-hidden="true"
          className="hero-video h-full w-full object-cover object-[62%_center] sm:object-center pointer-events-none select-none"
        >
          <source src="/promo/wedding-film.mp4" type="video/mp4" />
          <source src="/promo/wedding-story-film.mp4" type="video/mp4" />
        </video>
      </div>

      {/* Golden Akshathalu Canvas Overlay */}
      <canvas
        ref={canvasRef}
        className="hidden sm:block pointer-events-none absolute inset-0 z-[2] opacity-50"
      />

      {/* Clean Asymmetric Overlay (Allows the video to shine on the right side) */}
      <div
        className="absolute inset-0 z-[1] pointer-events-none"
        style={{
          background:
            "linear-gradient(105deg, rgba(122,12,46,0.38) 0%, rgba(160,20,58,0.26) 38%, rgba(0,109,106,0.10) 72%, rgba(15,31,60,0.02) 100%)",
        }}
      />
      <div
        className="absolute inset-0 z-[1] pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, rgba(15,31,60,0.06) 0%, transparent 38%, rgba(122,12,46,0.10) 68%, rgba(46,4,27,0.42) 100%)",
        }}
      />

      {/* Layered jewel-tone light keeps the photo vivid while text remains legible. */}
      <div className="pointer-events-none absolute -top-16 left-[-4rem] z-[2] h-72 w-72 rounded-full bg-rose-400/25 blur-[110px]" />
      <div className="pointer-events-none absolute top-1/4 right-[-4rem] z-[2] h-80 w-80 rounded-full bg-teal-300/25 blur-[110px]" />
      <div className="pointer-events-none absolute bottom-[-5rem] left-[28%] z-[2] h-72 w-72 rounded-full bg-amber-400/25 blur-[100px]" />

      {/* ================= 2. MAIN CONTAINER ================= */}
      <div className="relative z-[3] mx-auto w-full max-w-7xl px-5 sm:px-7 lg:px-10 py-9 sm:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
          
          {/* LEFT/SIDE CONTAINER: COMPACT & REFINED LUXURY PANEL */}
          <div className="lg:col-span-7 xl:col-span-7 text-left">
            <div className="max-w-2xl space-y-4 sm:space-y-5 text-shadow-hero">
              
              {/* Auspicious Eyebrow Badge */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/50 bg-[#2b0918] px-3 py-1 text-[11px] sm:text-xs font-black uppercase tracking-wider text-amber-300 shadow-sm">
                  <span>🪔</span>
                  <span>{L.kicker}</span>
                </span>

              </div>

              {/* Compact, Refined Royal Gold Headline */}
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-[1.18] tracking-tight text-white drop-shadow-[0_2px_18px_rgba(0,0,0,0.75)]">
                {L.titleA}
                <br />
                <span className="bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-400 bg-clip-text text-transparent">
                  {L.titleB}
                </span>
              </h1>

              <div className="h-1 w-16 rounded-full bg-gradient-to-r from-amber-200 via-yellow-400 to-transparent shadow-sm" aria-hidden="true" />

              {/* One clear account-creation action; browsing happens in the search card. */}
              <div className="flex items-center pt-1">
                <Link
                  href="/register"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-amber-300 via-amber-200 to-yellow-400 px-6 py-3 text-sm font-bold leading-snug text-rose-950 shadow-[0_10px_30px_rgba(245,158,11,0.28)] transition hover:brightness-105 active:scale-[.99] sm:px-7 sm:text-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-100"
                >
                  <span>{L.ctaReg}</span>
                  <span aria-hidden className="text-base">→</span>
                </Link>
              </div>

              <div className="pt-1">
                <span className="inline-flex max-w-full items-center gap-2 rounded-2xl border border-amber-200/50 bg-[#240914]/85 px-4 py-2.5 text-xs font-bold leading-relaxed text-amber-100 shadow-lg backdrop-blur-sm sm:text-sm">
                  <span className="shrink-0 text-amber-300" aria-hidden="true">✦</span>
                  <span>{L.pricePill}</span>
                </span>
                <p className="mt-1.5 text-[10px] leading-relaxed text-white/75 sm:text-xs">
                  {lang === "te" ? "చిత్రాలు సూచన కోసం మాత్రమే — సభ్యుల ప్రొఫైల్ ఫోటోలు కావు." : "Illustrative visuals only—not member profile photos."}
                </p>
              </div>

            </div>
          </div>

          <div className="lg:col-span-5 xl:col-span-5">
            <HomeMatchSearch />
          </div>
        </div>
      </div>
    </section>
  );
}
