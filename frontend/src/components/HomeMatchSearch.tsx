"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, MapPin, Search, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { useLang } from "@/lib/lang";
import { HEIGHTS, heightLabel } from "@/lib/telugu-data";

export default function HomeMatchSearch() {
  const router = useRouter();
  const te = useLang().lang === "te";
  const [gender, setGender] = useState("");
  const [minAge, setMinAge] = useState(18);
  const [maxAge, setMaxAge] = useState(60);
  const [minHeight, setMinHeight] = useState("");
  const [maxHeight, setMaxHeight] = useState("");
  const [place, setPlace] = useState("");
  const [adjusted, setAdjusted] = useState(false);
  function age(which: "min" | "max", value: number) {
    const cross = which === "min" ? value > maxAge : value < minAge;
    setAdjusted(cross);
    if (which === "min") { setMinAge(value); if (cross) setMaxAge(value); }
    else { setMaxAge(value); if (cross) setMinAge(value); }
  }
  function height(which: "min" | "max", value: string) {
    const other = which === "min" ? maxHeight : minHeight;
    const cross = !!value && !!other && (which === "min" ? HEIGHTS.indexOf(value) > HEIGHTS.indexOf(other) : HEIGHTS.indexOf(value) < HEIGHTS.indexOf(other));
    setAdjusted(cross);
    if (which === "min") { setMinHeight(value); if (cross) setMaxHeight(value); }
    else { setMaxHeight(value); if (cross) setMinHeight(value); }
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const q = new URLSearchParams();
    if (gender) q.set("gender", gender);
    if (minAge !== 18 || maxAge !== 60) { q.set("age_min", String(minAge)); q.set("age_max", String(maxAge)); }
    if (minHeight) q.set("height_min", minHeight);
    if (maxHeight) q.set("height_max", maxHeight);
    if (place === "NRI") q.set("nri_only", "true"); else if (place) q.set("state", place);
    router.push(q.size ? `/matches?${q}` : "/matches");
  }
  const ages = Array.from({ length: 43 }, (_, i) => i + 18);
  return <section className="home-search-card" aria-label="Profile search">
    <div className="home-search-card__heading"><span><SlidersHorizontal size={18} aria-hidden="true"/></span><div><p>{te ? "మీ ఎంపికతో మొదలు పెట్టండి" : "A good place to start"}</p><h2>{te ? "మీకు నచ్చే Profile వెతకండి" : "Find your kind of person"}</h2></div></div>
    <form onSubmit={submit} role="search" aria-label="Profile search">
      <div className="home-search-card__who" role="group" aria-label="Bride or Groom">
        <span className="home-search-card__label">{te ? "మీరు వెతికేది" : "Looking for"}</span>
        <div>{[{v:"Bride",te:"వధువు",en:"Bride"},{v:"Groom",te:"వరుడు",en:"Groom"}].map(o=><button key={o.v} type="button" aria-pressed={gender===o.v} onClick={()=>setGender(gender===o.v?"":o.v)}>{te?o.te:o.en}</button>)}</div>
      </div>
      <fieldset className="home-search-card__range"><legend>Age</legend><div>
        <label>Min Age<select aria-label="Min Age" value={minAge} onChange={e=>age("min",+e.target.value)}>{ages.map(v=><option key={v} value={v}>{v}</option>)}</select></label>
        <label>Max Age<select aria-label="Max Age" value={maxAge} onChange={e=>age("max",+e.target.value)}>{ages.map(v=><option key={v} value={v}>{v}</option>)}</select></label>
      </div></fieldset>
      <fieldset className="home-search-card__range"><legend>Height <span>{te ? "అవసరమైతే" : "Optional"}</span></legend><div>
        <label>Min Height<select aria-label="Min Height" value={minHeight} onChange={e=>height("min",e.target.value)}><option value="">Any</option>{HEIGHTS.map(v=><option key={v} value={v}>{heightLabel(v)}</option>)}</select></label>
        <label>Max Height<select aria-label="Max Height" value={maxHeight} onChange={e=>height("max",e.target.value)}><option value="">Any</option>{HEIGHTS.map(v=><option key={v} value={v}>{heightLabel(v)}</option>)}</select></label>
      </div></fieldset>
      <label className="home-search-card__place"><span className="home-search-card__label"><MapPin size={13} aria-hidden="true"/>Place</span><select aria-label="Place" value={place} onChange={e=>setPlace(e.target.value)}><option value="">Any place</option><option value="TS">Telangana</option><option value="AP">Andhra Pradesh</option><option value="NRI">NRI / Abroad</option></select></label>
      {adjusted && <p className="home-search-card__adjusted" role="status">{te ? "Min, Max కంటే ఎక్కువ ఉండకూడదు. రెండూ ఒకేలా మార్చాం." : "Min cannot be higher than Max. Both now use the selected value."}</p>}
      <button className="home-search-card__submit" type="submit"><Search size={17} aria-hidden="true"/>{te ? "Profiles చూడండి" : "Find profiles"}<ArrowRight size={17} aria-hidden="true"/></button>
    </form>
    <p className="home-search-card__safety"><ShieldCheck size={15} aria-hidden="true"/><span>{te ? "వారు accept చేశాకే Contact వివరాలు కనిపిస్తాయి. Profile వివరాలు మీరూ చెక్ చేసుకోండి." : "Contact details appear after they accept. Check profile details yourself."} <Link href="/safety">{te?"Safety వివరాలు":"Safety tips"}</Link></span></p>
  </section>;
}
