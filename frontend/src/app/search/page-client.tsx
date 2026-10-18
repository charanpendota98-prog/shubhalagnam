"use client";

/** Direct profile lookup — only the real ID shared by a member can open it. */
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Duo } from "@/lib/duo";
import { useLang } from "@/lib/lang";
import { Button, Card, CardBody, Field } from "@/components/ui";

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
    <div className="search-landing min-h-[calc(100svh-10rem)] px-4 py-8 sm:px-6 lg:py-14">
      <div className="mx-auto grid w-full max-w-5xl items-stretch gap-5 lg:grid-cols-[1.05fr_.95fr]">
        <section className="search-landing__intro rounded-[2rem] p-6 text-white shadow-[0_26px_60px_-28px_rgba(92,8,34,.8)] sm:p-9">
          <span className="ds-badge ds-badge--light">{te ? "సురక్షిత profile lookup" : "Secure profile lookup"}</span>
          <div className="mt-8 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-3xl" aria-hidden="true">⌕</div>
          <h1 className="mt-5 max-w-xl text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
            <Duo en="Open a profile shared with you" te="మీతో share చేసిన profile తెరవండి" />
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-white/75 sm:text-base">
            <Duo
              en="Use the exact Profile ID from the member. Search does not guess names, reveal private contacts, or turn profile fields into a compatibility result."
              te="సభ్యుడు ఇచ్చిన exact Profile ID వాడండి. Search పేర్లు ఊహించదు, private contacts చూపించదు, profile fields ను compatibility result గా మార్చదు."
            />
          </p>
          <div className="mt-8 grid gap-2.5 sm:grid-cols-3">
            {[
              ["01", te ? "నిజమైన ID" : "Real ID"],
              ["02", te ? "Owner-controlled" : "Owner controlled"],
              ["03", te ? "Privacy first" : "Privacy first"],
            ].map(([number, label]) => (
              <div key={number} className="rounded-2xl border border-white/15 bg-white/[.08] p-3">
                <span className="text-[10px] font-black tracking-[.18em] text-gold-light">{number}</span>
                <p className="mt-1 text-xs font-bold text-white/90">{label}</p>
              </div>
            ))}
          </div>
        </section>

        <Card as="section" tone="brand" className="flex flex-col justify-center rounded-[2rem]">
          <CardBody className="p-6 sm:p-9">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="ds-eyebrow">{te ? "Profile ID" : "Profile ID"}</p>
                <h2 className="mt-2 text-2xl font-extrabold text-maroon">
                  <Duo en="Search by ID" te="ID తో వెతకండి" />
                </h2>
              </div>
              <span className="rounded-xl bg-gold-soft px-3 py-2 text-xl" aria-hidden="true">🔎</span>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              <Duo en="The ID is normally shared after registration or by a profile owner." te="ఈ ID సాధారణంగా registration తర్వాత లేదా profile owner share చేస్తారు." />
            </p>
            <form className="mt-7 space-y-4" onSubmit={(event) => { event.preventDefault(); go(); }}>
              <Field id="profile-search-id" label={te ? "Profile ID" : "Profile ID"} hint={te ? "ఉదా: MV-1234" : "Example: MV-1234"}>
                {({ controlId, describedBy }) => (
                  <input
                    id={controlId}
                    aria-describedby={describedBy}
                    value={id}
                    onChange={(event) => setId(event.target.value.toUpperCase())}
                    placeholder="MV-1234"
                    inputMode="text"
                    autoCapitalize="characters"
                    autoComplete="off"
                    className="ds-control font-bold uppercase tracking-[.12em]"
                  />
                )}
              </Field>
              <Button type="submit" block size="lg" iconRight={<span aria-hidden="true">→</span>}>
                <Duo en="Open profile" te="ప్రొఫైల్ తెరవండి" />
              </Button>
            </form>
            <div className="mt-6 grid gap-2 border-t border-maroon/10 pt-5 sm:grid-cols-2">
              <Button href="/matches" variant="outline" block>
                <Duo en="Browse matches" te="Matches చూడండి" />
              </Button>
              <Button href="/register" variant="ghost" block>
                <Duo en="Create profile" te="ప్రొఫైల్ సృష్టించండి" />
              </Button>
            </div>
            <p className="mt-5 rounded-2xl bg-cream px-4 py-3 text-xs leading-5 text-slate-600">
              <span aria-hidden="true">🔒 </span>
              <Duo en="Only approved, shareable profile information is shown. Contact access requires the owner’s acceptance." te="Approved, share చేయగల profile information మాత్రమే కనిపిస్తుంది. Contact access కోసం owner acceptance అవసరం." />
            </p>
          </CardBody>
        </Card>
      </div>
      <p className="mx-auto mt-5 max-w-5xl text-center text-xs text-slate-500">
        <Link href="/safety" className="font-bold text-maroon underline-offset-4 hover:underline">
          <Duo en="Read safety guidance before making contact" te="Contact చేయడానికి ముందు safety guidance చదవండి" />
        </Link>
      </p>
    </div>
  );
}
