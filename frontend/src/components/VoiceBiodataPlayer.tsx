"use client";

import { useRef, useState } from "react";
import { useLang } from "@/lib/lang";

interface Props {
  voiceUrl: string;
  name?: string;
  role?: string;
}

export default function VoiceBiodataPlayer({ voiceUrl, name, role }: Props) {
  const { lang } = useLang();
  const te = lang === "te";
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackError, setPlaybackError] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progress = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  if (!voiceUrl) return null;

  const formatTime = (seconds: number) => {
    const safeSeconds = Number.isFinite(seconds) ? seconds : 0;
    const minutes = Math.floor(safeSeconds / 60);
    const remainder = Math.floor(safeSeconds % 60);
    return `${minutes}:${remainder < 10 ? "0" : ""}${remainder}`;
  };

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      setPlaybackError(false);
      void audio.play().catch(() => setPlaybackError(true));
    } else {
      audio.pause();
    }
  };

  // A fixed, deterministic waveform illustration; playback time comes from the real audio element.
  const barHeights = [24, 45, 65, 80, 50, 95, 70, 40, 85, 60, 75, 90, 45, 60, 80, 35];
  const playLabel = isPlaying ? (te ? "ఆడియో ఆపండి" : "Pause audio") : (te ? "ఆడియో ప్లే చేయండి" : "Play audio");

  return (
    <div className="rounded-2xl border-2 border-amber-300 bg-gradient-to-r from-amber-50 via-rose-50 to-amber-50 p-3.5 shadow-xs sm:p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#7A0C2E] text-xs text-white shadow-xs">
            🎙️
          </span>
          <div className="min-w-0">
            <h4 className="text-xs font-extrabold text-[#7A0C2E] sm:text-sm">
              {te ? "వాయిస్ పరిచయం (Audio Biodata Intro)" : "Voice Biodata Intro"}
            </h4>
            <p className="truncate text-[10px] font-medium text-slate-600 sm:text-[11px]">
              {name ? `${name}${role ? ` (${role})` : ""}` : te ? "అభ్యర్థి స్వరం ద్వారా స్వీయ పరిచయం" : "Self-introduction in the member’s own voice"}
            </p>
          </div>
        </div>
        <span className="shrink-0 rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900" aria-label={te ? "ఆడియో నిడివి" : "Audio duration"}>
          🔊 {formatTime(duration)}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={togglePlay}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#7A0C2E] text-white shadow-md transition hover:bg-[#911339] active:scale-95"
          aria-label={playLabel}
          aria-pressed={isPlaying}
        >
          {isPlaying ? <span className="text-sm font-bold" aria-hidden="true">❚❚</span> : <span className="ml-0.5 text-sm font-bold" aria-hidden="true">▶</span>}
        </button>

        <div className="flex min-w-0 flex-1 flex-col justify-center" role="group" aria-label={te ? "ఆడియో పురోగతి" : "Audio progress"}>
          <div className="flex h-8 items-end gap-1 px-1" aria-hidden="true">
            {barHeights.map((height, index) => {
              const active = (index / barHeights.length) * 100 <= progress;
              const pulseScale = 0.6 + (index % 5) * 0.08;
              return (
                <div
                  key={index}
                  className={`flex-1 rounded-full transition-colors duration-200 ${active ? "bg-[#7A0C2E]" : "bg-slate-300"} ${isPlaying ? "animate-pulse" : ""}`}
                  style={{ height: `${isPlaying ? Math.max(20, height * pulseScale) : height}%` }}
                />
              );
            })}
          </div>
          <div className="mt-1 flex items-center justify-between font-mono text-[10px] text-slate-500" aria-live="off">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>

      {playbackError ? <p className="mt-2 text-[11px] text-rose-700" role="status">{te ? "ఆడియో ప్లే కాలేదు. మళ్లీ ప్రయత్నించండి." : "Audio could not be played. Please try again."}</p> : null}
      <audio
        ref={audioRef}
        src={voiceUrl}
        preload="metadata"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={(event) => { event.currentTarget.currentTime = 0; setIsPlaying(false); setCurrentTime(0); }}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onLoadedMetadata={(event) => {
          const seconds = event.currentTarget.duration;
          if (Number.isFinite(seconds)) setDuration(seconds);
        }}
        onError={() => { setIsPlaying(false); setPlaybackError(true); }}
        className="hidden"
      />
    </div>
  );
}
