"use client";

/**
 * 👑 MANA VIVAHA — RESPONSIVE CINEMATIC WEDDING HERO
 * ===================================================
 * • Local decorative wedding film with an optimized poster fallback.
 * • Clear bilingual brand, concise headline, and touch-friendly actions.
 * • Responsive typography and spacing for phone through desktop widths.
 */

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useLang, type Lang } from "@/lib/lang";
import HomeMatchSearch from "@/components/HomeMatchSearch";
import { Button } from "@/components/ui";


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
  const [filmSrc, setFilmSrc] = useState("/promo/wedding-film-mobile.mp4");
  const [userPaused, setUserPaused] = useState(false);
  const [filmPlaying, setFilmPlaying] = useState(false);
  const [filmReady, setFilmReady] = useState(false);
  const [filmFailed, setFilmFailed] = useState(false);

  const metered = () => {
    const connection = (navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    }).connection;
    return Boolean(connection?.saveData) || /2g/.test(String(connection?.effectiveType || ""));
  };

  // Pick the encode that suits the device: the small file on phones or on a
  // metered connection, the full one on anything else. The poster is identical
  // for both, so switching never causes a visible jump.
  useEffect(() => {
    const smallScreen = window.matchMedia("(max-width: 767px)");
    const pick = () => {
      setFilmSrc(metered() || smallScreen.matches
        ? "/promo/wedding-film-mobile.mp4"
        : "/promo/wedding-film.mp4");
    };
    pick();
    smallScreen.addEventListener("change", pick);
    return () => smallScreen.removeEventListener("change", pick);
  }, []);

  // Keep the wedding film decorative: play it only when it is visible, motion
  // is allowed and the connection is not metered. The poster remains a stable,
  // complete fallback when autoplay, loading, or the device policy says no.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !filmSrc) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let isVisible = !("IntersectionObserver" in window);
    let disposed = false;
    setFilmReady(false);
    setFilmFailed(false);

    const onPlay = () => setFilmPlaying(true);
    const onPause = () => setFilmPlaying(false);
    const onReady = () => { setFilmReady(true); setFilmFailed(false); };
    const onError = () => {
      setFilmFailed(true);
      setFilmReady(false);
      video.pause();
    };
    const syncPlayback = () => {
      if (disposed || userPaused || reducedMotion.matches || metered()
          || document.visibilityState !== "visible" || !isVisible) {
        video.pause();
        return;
      }
      if (video.src !== new URL(filmSrc, window.location.href).href) {
        video.src = filmSrc;
        video.load();
      }
      void video.play().catch(() => {
        // Autoplay can be blocked by browser policy; keep the poster and expose
        // a play control once the media reports that it is ready.
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
    document.addEventListener("visibilitychange", syncPlayback);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("canplay", onReady);
    video.addEventListener("loadeddata", onReady);
    video.addEventListener("error", onError);
    syncPlayback();

    return () => {
      disposed = true;
      observer?.disconnect();
      reducedMotion.removeEventListener("change", syncPlayback);
      document.removeEventListener("visibilitychange", syncPlayback);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("canplay", onReady);
      video.removeEventListener("loadeddata", onReady);
      video.removeEventListener("error", onError);
      video.pause();
    };
  }, [filmSrc, userPaused]);

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
          preload="metadata"
          disablePictureInPicture
          aria-hidden="true"
          onCanPlay={() => { setFilmReady(true); setFilmFailed(false); }}
          onError={() => { setFilmFailed(true); setFilmReady(false); }}
          className={`hero-video h-full w-full object-cover object-center sm:object-center pointer-events-none select-none ${filmFailed ? "opacity-0" : ""}`}
        />
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

      {/* Soft hand-off from the film into the cream page body below. */}
      <div className="hp-hero-fade" aria-hidden="true" />

      {/* WCAG 2.2.2: moving background longer than five seconds needs a pause.
          The control only appears once the film has actually started. */}
      {filmReady && !filmFailed ? (
        <button
          type="button"
          onClick={() => {
            if (filmPlaying && !userPaused) setUserPaused(true);
            else {
              setUserPaused(false);
              void videoRef.current?.play().catch(() => undefined);
            }
          }}
          aria-pressed={userPaused}
          className="hero-film-toggle"
        >
          <span aria-hidden="true">{filmPlaying && !userPaused ? "\u23F8" : "\u25B6"}</span>
          <span>{filmPlaying && !userPaused
            ? (lang === "te" ? "నేపథ్య వీడియో ఆపండి" : "Pause background video")
            : (lang === "te" ? "నేపథ్య వీడియో ప్రారంభించండి" : "Play background video")}</span>
        </button>
      ) : null}

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
                <span className="hp-hero-badge">
                  <span aria-hidden="true">🪔</span>
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

              <div className="hp-hero-rule" aria-hidden="true" />

              {/* One clear account-creation action; browsing happens in the search card. */}
              <div className="flex items-center pt-1">
                <Button
                  href="/register"
                  variant="primary"
                  size="lg"
                  iconRight={<span aria-hidden="true" className="text-base">→</span>}
                >
                  {L.ctaReg}
                </Button>
              </div>

              <div className="pt-1">
                <p className="hp-hero-note">
                  <span className="hp-hero-note__icon" aria-hidden="true">✦</span>
                  <span>{L.pricePill}</span>
                </p>
                <p className="hp-hero-disclaimer">
                  {lang === "te" ? "చిత్రాలు సూచన కోసం మాత్రమే — సభ్యుల ప్రొఫైల్ ఫోటోలు కావు." : "Illustrative visuals only—not member profile photos."}
                </p>
              </div>

            </div>
          </div>

          <div className="lg:col-span-5 xl:col-span-5">
            <div className="hp-hero-panel">
              <HomeMatchSearch />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
