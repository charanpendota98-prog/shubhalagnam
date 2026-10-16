"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight, Maximize2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLang } from "@/lib/lang";

type GalleryPhoto = {
  src: string;
  title: { te: string; en: string };
  alt: { te: string; en: string };
};

const PHOTOS: GalleryPhoto[] = [
  {
    src: "/promo/cine-royal-wide.jpg",
    title: { te: "పెళ్లి వేడుక", en: "A wedding celebration" },
    alt: {
      te: "పూలతో అలంకరించిన వేదికపై సంప్రదాయ దుస్తుల్లో ఉన్న వధూవరుల సృజనాత్మక చిత్రం",
      en: "Illustrative image of a couple in traditional attire at a flower-decorated wedding venue",
    },
  },
  {
    src: "/promo/cine-hero-telugu.jpg",
    title: { te: "మంగళసూత్ర ధారణ", en: "A sacred ceremony" },
    alt: {
      te: "వివాహ వేడుకలో మంగళసూత్రం కడుతున్న జంటను చూపించే సృజనాత్మక చిత్రం",
      en: "Illustrative image of a couple during a traditional wedding ritual",
    },
  },
  {
    src: "/promo/cine-couple-hd.jpg",
    title: { te: "కుటుంబాల ఆనందం", en: "A joyful gathering" },
    alt: {
      te: "వివాహ వేదికపై కుటుంబ సభ్యుల మధ్య నిలిచిన జంటను చూపించే సృజనాత్మక చిత్రం",
      en: "Illustrative image of a couple at a wedding venue with family in the background",
    },
  },
  {
    src: "/promo/story-1.jpg",
    title: { te: "పూలమాలల వేడుక", en: "The garland exchange" },
    alt: {
      te: "పూలమాలలు మార్చుకుంటున్న వధూవరుల సృజనాత్మక చిత్రం",
      en: "Illustrative image of a couple exchanging wedding garlands",
    },
  },
];

export default function CinematicGallery() {
  const { lang } = useLang();
  const te = lang === "te";
  const [activePhoto, setActivePhoto] = useState<number | null>(null);
  const [filmError, setFilmError] = useState(false);
  const filmRef = useRef<HTMLVideoElement | null>(null);
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const previousBodyOverflow = useRef<string | null>(null);

  // Stop audio/video when it scrolls away or the tab is backgrounded.
  useEffect(() => {
    const video = filmRef.current;
    if (!video) return;

    const pauseWhenHidden = () => {
      if (document.visibilityState !== "visible") video.pause();
    };
    const observer = "IntersectionObserver" in window
      ? new IntersectionObserver(([entry]) => {
          if (!entry?.isIntersecting) video.pause();
        }, { threshold: 0.15 })
      : null;
    observer?.observe(video);
    document.addEventListener("visibilitychange", pauseWhenHidden);

    return () => {
      observer?.disconnect();
      document.removeEventListener("visibilitychange", pauseWhenHidden);
      video.pause();
    };
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (activePhoto !== null) {
      if (!dialog.open) {
        dialog.showModal();
        previousBodyOverflow.current = document.body.style.overflow;
        document.body.style.overflow = "hidden";
      }
      return;
    }

    if (dialog.open) dialog.close();
    if (previousBodyOverflow.current !== null) {
      document.body.style.overflow = previousBodyOverflow.current;
      previousBodyOverflow.current = null;
    }
  }, [activePhoto]);

  useEffect(() => () => {
    if (dialogRef.current?.open) dialogRef.current.close();
    if (previousBodyOverflow.current !== null) {
      document.body.style.overflow = previousBodyOverflow.current;
      previousBodyOverflow.current = null;
    }
  }, []);

  useEffect(() => {
    if (activePhoto === null) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setActivePhoto((index) => index === null ? null : (index + PHOTOS.length - 1) % PHOTOS.length);
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        setActivePhoto((index) => index === null ? null : (index + 1) % PHOTOS.length);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activePhoto]);

  const movePhoto = (direction: -1 | 1) => {
    setActivePhoto((index) => index === null ? null : (index + PHOTOS.length + direction) % PHOTOS.length);
  };
  const currentPhoto = activePhoto === null ? null : PHOTOS[activePhoto];

  return (
    <section
      id="wedding-gallery"
      className="home-gallery relative isolate mx-auto my-8 w-full max-w-7xl overflow-hidden rounded-[2rem] border border-amber-100/15 bg-gradient-to-br from-[#160a12] via-[#32101f] to-[#0c2c2c] px-4 py-9 text-white shadow-2xl sm:my-12 sm:px-7 sm:py-12 lg:px-9 lg:py-14"
      aria-label={te ? "వివాహ వేడుకల వీడియో మరియు చిత్రాల గ్యాలరీ" : "Wedding film and photo gallery"}
    >
      <div className="pointer-events-none absolute -right-20 -top-24 h-80 w-80 rounded-full bg-rose-500/15 blur-[100px]" aria-hidden="true" />
      <div className="pointer-events-none absolute -bottom-32 left-1/4 h-80 w-80 rounded-full bg-amber-400/10 blur-[110px]" aria-hidden="true" />

      <div className="relative z-10">
        <div className="mx-auto mb-6 max-w-3xl text-center sm:mb-8">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-white/5 px-3.5 py-1.5 text-xs font-bold text-amber-200">
            <span aria-hidden="true">✦</span>
            <span>{te ? "మన వివాహ · వేడుకల గ్యాలరీ" : "Mana Vivaha · Celebration gallery"}</span>
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl md:text-4xl">
            {te ? "తెలుగు వేడుకల అందమైన క్షణాలు" : "A glimpse of Telugu celebrations"}
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-white/70 sm:text-base">
            {te
              ? "వీడియోను ఇక్కడే ప్లే చేయండి; ఫోటోను నొక్కి పెద్దగా చూడండి."
              : "Play the film here; select any photo to view it larger."}
          </p>
        </div>

        <div className="grid gap-3 sm:gap-4 lg:grid-cols-[1.35fr_1fr]">
          <article className="overflow-hidden rounded-3xl border border-white/10 bg-black/30 shadow-2xl">
            <div className="relative aspect-video overflow-hidden bg-black">
              <video
                ref={filmRef}
                controls
                playsInline
                preload="metadata"
                poster="/promo/wedding-story-poster.jpg"
                onError={() => setFilmError(true)}
                onCanPlay={() => setFilmError(false)}
                aria-label={te ? "సూచన కోసం రూపొందించిన వివాహ వేడుకల వీడియో" : "Illustrative wedding film player"}
                className="h-full w-full bg-black object-cover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-amber-400"
              >
                <source src="/promo/wedding-story-film.mp4" type="video/mp4" />
              </video>
            </div>
            <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-3 sm:px-5 sm:py-4">
              <div className="min-w-0">
                <h3 className="text-base font-extrabold text-white sm:text-lg">
                  {te ? "వివాహ వేడుకల వీడియో" : "Wedding ceremony film"}
                </h3>
                <p className="mt-1 text-xs leading-5 text-white/65 sm:text-sm">
                  {te ? "క్రింది నియంత్రణలతో ప్లే చేయండి, ఆపండి లేదా ధ్వనిని మార్చండి." : "Use the controls below to play, pause, or adjust the sound."}
                </p>
                {filmError && (
                  <p role="status" className="mt-2 text-xs text-amber-200">
                    {te ? "వీడియో ప్లే కాలేదు. కొద్దిసేపటి తర్వాత మళ్లీ ప్రయత్నించండి." : "The video could not be played. Please try again later."}
                  </p>
                )}
              </div>
              <span className="shrink-0 rounded-full border border-amber-200/25 bg-amber-100/10 px-3 py-1 text-[11px] font-semibold text-amber-100 sm:text-xs">
                {te ? "సూచన వీడియో" : "Illustrative film"}
              </span>
            </div>
          </article>

          <div className="grid grid-cols-[repeat(2,minmax(0,1fr))] grid-rows-2 gap-3 sm:gap-4">
            {PHOTOS.map((photo, index) => (
              <article key={photo.src} className="group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06] shadow-lg sm:rounded-3xl">
                <button
                  type="button"
                  onClick={() => setActivePhoto(index)}
                  aria-haspopup="dialog"
                  aria-label={te ? `${photo.title.te} — పెద్దగా చూడండి` : `${photo.title.en} — view larger`}
                  className="relative block aspect-[4/3] w-full overflow-hidden bg-slate-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-amber-400"
                >
                  <Image
                    src={photo.src}
                    alt=""
                    fill
                    sizes="(max-width: 640px) 42vw, (max-width: 1024px) 40vw, 22vw"
                    className="object-cover transition-transform duration-500 motion-reduce:transition-none group-hover:scale-105 motion-reduce:group-hover:scale-100"
                  />
                  <span className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full border border-white/30 bg-black/45 text-white backdrop-blur-sm sm:right-3 sm:top-3" aria-hidden="true">
                    <Maximize2 className="h-3.5 w-3.5" />
                  </span>
                </button>
                <div className="flex min-h-11 items-center px-3 py-2 sm:min-h-12 sm:px-3.5">
                  <h3 className="min-w-0 truncate text-xs font-bold text-white sm:text-sm">
                    {te ? photo.title.te : photo.title.en}
                  </h3>
                </div>
              </article>
            ))}
          </div>
        </div>

        <p className="mx-auto mt-4 max-w-3xl text-center text-[11px] leading-5 text-white/60 sm:mt-5 sm:text-xs">
          {te
            ? "ఈ వీడియో, ఫోటోలు సూచన కోసం మాత్రమే; నిజమైన సభ్యుల ప్రొఫైల్ ఫోటోలు లేదా సభ్యుల కథలు కావు."
            : "The film and photos are illustrative artwork, not member profile photos or member stories."}
        </p>
      </div>

      <dialog
        ref={dialogRef}
        aria-labelledby="media-dialog-title"
        onCancel={(event) => {
          event.preventDefault();
          setActivePhoto(null);
        }}
        onClose={() => setActivePhoto(null)}
        className="fixed inset-0 m-auto max-h-[92svh] w-[min(94vw,72rem)] overflow-hidden rounded-3xl border border-white/10 bg-[#100910] p-0 text-white shadow-2xl backdrop:bg-black/85"
      >
        <div className="flex h-[min(90svh,52rem)] max-h-[92svh] flex-col">
          <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6 sm:py-4">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-300">
                {te ? "మన వివాహ · గ్యాలరీ" : "Mana Vivaha · Gallery"}
              </p>
              <h3 id="media-dialog-title" className="truncate text-base font-bold sm:text-lg">
                {currentPhoto ? (te ? currentPhoto.title.te : currentPhoto.title.en) : ""}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setActivePhoto(null)}
              aria-label={te ? "గ్యాలరీ మూసివేయండి" : "Close gallery"}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          {currentPhoto && (
            <div className="relative flex min-h-[220px] flex-1 items-center justify-center bg-black sm:min-h-[360px]">
              <Image
                src={currentPhoto.src}
                alt={te ? currentPhoto.alt.te : currentPhoto.alt.en}
                fill
                sizes="94vw"
                className="object-contain"
                priority
              />
            </div>
          )}

          {activePhoto !== null && currentPhoto && (
            <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
              <span className="min-w-0 text-xs text-white/70">
                {activePhoto + 1} / {PHOTOS.length} · {te ? "సూచన చిత్రాలు" : "Illustrative artwork"}
              </span>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => movePhoto(-1)}
                  aria-label={te ? "మునుపటి చిత్రం" : "Previous photo"}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/10 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                >
                  <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => movePhoto(1)}
                  aria-label={te ? "తదుపరి చిత్రం" : "Next photo"}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/10 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                >
                  <ChevronRight className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
            </div>
          )}
        </div>
      </dialog>
    </section>
  );
}
