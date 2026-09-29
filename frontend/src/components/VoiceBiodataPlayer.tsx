"use client";

import { useEffect, useRef, useState } from "react";
import { useLang } from "@/lib/lang";

interface Props {
  voiceUrl?: string;
  name?: string;
  role?: string;
}

export default function VoiceBiodataPlayer({ voiceUrl, name, role }: Props) {
  const { lang } = useLang();
  const te = lang === "te";
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(25); // Simulated or real duration
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= duration) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, duration]);

  useEffect(() => {
    setProgress((currentTime / duration) * 100);
  }, [currentTime, duration]);

  const togglePlay = () => {
    if (audioRef.current && voiceUrl) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play().catch(() => {});
        setIsPlaying(true);
      }
    } else {
      // Demo simulation
      setIsPlaying(!isPlaying);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  // 16 animated waveform bars
  const barHeights = [24, 45, 65, 80, 50, 95, 70, 40, 85, 60, 75, 90, 45, 60, 80, 35];

  return (
    <div className="rounded-2xl border-2 border-amber-300 bg-gradient-to-r from-amber-50 via-rose-50 to-amber-50 p-3.5 sm:p-4 shadow-xs">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#7A0C2E] text-white text-xs shadow-xs">
            🎙️
          </span>
          <div>
            <h4 className="text-xs sm:text-sm font-extrabold text-[#7A0C2E]">
              {te ? "వాయిస్ పరిచయం (Audio Biodata Intro)" : "Voice Biodata Intro"}
            </h4>
            <p className="text-[10px] sm:text-[11px] text-slate-600 font-medium">
              {name ? `${name} ${role ? `(${role})` : ""}` : te ? "అభ్యర్థి స్వరం ద్వారా స్వీయ పరిచయం" : "Self-introduction in candidate's own voice"}
            </p>
          </div>
        </div>
        <span className="rounded-full bg-amber-100 border border-amber-300 px-2 py-0.5 text-[10px] font-bold text-amber-900">
          🔊 0:{duration < 10 ? "0" : ""}{duration}
        </span>
      </div>

      <div className="flex items-center gap-3 mt-3">
        {/* Play/Pause Button */}
        <button
          type="button"
          onClick={togglePlay}
          className="h-10 w-10 shrink-0 rounded-full bg-[#7A0C2E] hover:bg-[#911339] text-white flex items-center justify-center shadow-md transition transform active:scale-95"
          aria-label={isPlaying ? "Pause audio" : "Play audio"}
        >
          {isPlaying ? (
            <span className="text-sm font-bold">❚❚</span>
          ) : (
            <span className="text-sm font-bold ml-0.5">▶</span>
          )}
        </button>

        {/* Waveform & Scrubber */}
        <div className="flex-1 flex flex-col justify-center">
          <div className="flex items-end gap-1 h-8 px-1">
            {barHeights.map((h, i) => {
              const active = (i / barHeights.length) * 100 <= progress;
              return (
                <div
                  key={i}
                  className={`flex-1 rounded-full transition-all duration-200 ${
                    active ? "bg-[#7A0C2E]" : "bg-slate-300"
                  } ${isPlaying ? "animate-pulse" : ""}`}
                  style={{
                    height: `${isPlaying ? Math.max(20, (h * (0.6 + Math.random() * 0.4))) : h}%`,
                  }}
                />
              );
            })}
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono mt-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>

      {voiceUrl && (
        <audio
          ref={audioRef}
          src={voiceUrl}
          onEnded={() => {
            setIsPlaying(false);
            setCurrentTime(0);
          }}
          onTimeUpdate={(e) => {
            const current = (e.target as HTMLAudioElement).currentTime;
            setCurrentTime(current);
          }}
          onLoadedMetadata={(e) => {
            const dur = (e.target as HTMLAudioElement).duration;
            if (dur && !isNaN(dur)) setDuration(Math.round(dur));
          }}
          className="hidden"
        />
      )}
    </div>
  );
}
