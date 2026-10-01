"use client";
/**
 * /search — ID enter chesi profile chudandi (cards/QR links → /search/{ID}).
 * Index page lekapothe 404 kanipistundi — ikkada chinna prompt + input.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Duo } from "@/lib/duo";
import { useLang } from "@/lib/lang";

export default function SearchIndexPage() {
  const { lang } = useLang();
  const te = lang === "te";
  const router = useRouter();
  const [id, setId] = useState("");

  const go = () => {
    const clean = id.trim().toUpperCase();
    if (clean) router.push(`/search/${encodeURIComponent(clean)}`);
  };

  return (
    <div className="min-h-dvh bg-cream p-4 grid place-items-center">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 card-shadow border border-gold/30 text-center">
        <div className="text-3xl">🔍</div>
        <h1 className="mt-2 text-xl font-bold text-maroon">
          <Duo en="Search profile by ID" te="ID తో ప్రొఫైల్ చూడండి" />
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          <Duo
            en="Example: RED001, KAP001, VEL001"
            te="ఉదాహరణ: RED001, KAP001, VEL001"
          />
        </p>
        <div className="mt-4 flex gap-2">
          <input
            value={id}
            onChange={(e) => setId(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && go()}
            placeholder="RED001"
            inputMode="text"
            autoCapitalize="characters"
            className="flex-1 px-4 py-3 rounded-xl border border-gold/40 bg-cream text-maroon font-bold text-base focus-brand outline-none"
          />
          <button
            onClick={go}
            className="px-5 py-3 rounded-xl maroon-gradient text-white font-bold text-sm"
          >
            <Duo en="Search" te="వెతకండి" />
          </button>
        </div>
      </div>
    </div>
  );
}
