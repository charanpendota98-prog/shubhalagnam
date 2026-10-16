"use client";

/**
 * ❤️ Shortlist workspace
 * ----------------------
 * One place to review saved profiles and keep a private reminder on each.
 *
 * Privacy rules enforced by the API and mirrored here:
 * • The list and the notes are owner-only; a missing/expired token shows a
 *   login gate instead of data.
 * • Notes never reach the other member — they are stored on the owner's
 *   shortlist row and returned only to that account.
 * • Nothing is written to localStorage except the session id the app already
 *   keeps; note drafts live in component state only until they are saved.
 */

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { apiPost, authHeaders, readApiJson } from "@/lib/api";
import { useLang } from "@/lib/lang";
import AuthGate from "@/components/AuthGate";
import { CardSkeletonList } from "@/components/Skeletons";
import { Badge, Button, Card, CardBody, EmptyState, Field } from "@/components/ui";

type SavedProfile = {
  tsap_id?: string;
  full_name?: string;
  age?: number | string | null;
  caste?: string;
  district?: string;
  education?: string;
  job?: string;
  photo_url?: string;
  gender?: string;
};

type SavedItem = {
  saved_at?: string;
  note?: string;
  note_at?: string;
  profile?: SavedProfile;
};

const NOTE_MAX = 280;

function formatDate(value: string, te: boolean): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  try {
    return date.toLocaleDateString(te ? "te-IN" : "en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return value.slice(0, 10);
  }
}

export default function ShortlistWorkspace() {
  const { lang } = useLang();
  const te = lang === "te";

  const [myId, setMyId] = useState("");
  const [items, setItems] = useState<SavedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [unauthorized, setUnauthorized] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState("");
  const [removingId, setRemovingId] = useState("");
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    try {
      setMyId(localStorage.getItem("tsap_id") || localStorage.getItem("tsap_last_id") || "");
    } catch {
      /* ignore */
    }
  }, []);

  const load = useCallback(async () => {
    if (!myId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(false);
    setUnauthorized(false);
    try {
      const response = await fetch(`/api/saved/${encodeURIComponent(myId)}`, { headers: authHeaders() });
      if (response.status === 401 || response.status === 403) {
        setUnauthorized(true);
        setItems([]);
        return;
      }
      if (!response.ok) {
        setLoadError(true);
        return;
      }
      const data = await readApiJson(response);
      const saved = Array.isArray(data?.saved) ? data.saved : [];
      setItems(saved.filter((item: SavedItem) => item?.profile?.tsap_id));
      const nextDrafts: Record<string, string> = {};
      for (const item of saved) {
        const id = String(item?.profile?.tsap_id || "");
        if (id) nextDrafts[id] = String(item?.note || "");
      }
      setDrafts(nextDrafts);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [myId]);

  useEffect(() => {
    void load();
  }, [load, attempt]);

  // `explicit` lets the clear action save "" without racing the draft state.
  const saveNote = async (profileId: string, explicit?: string) => {
    const note = String(explicit ?? drafts[profileId] ?? "").slice(0, NOTE_MAX);
    setSavingId(profileId);
    setNotice(null);
    const { ok } = await apiPost<{ note?: string; note_at?: string }>(
      `/api/saved/${encodeURIComponent(myId)}/${encodeURIComponent(profileId)}/note`,
      { note },
    );
    setSavingId("");
    if (!ok) {
      setNotice({ tone: "error", text: te ? "నోట్ save కాలేదు. మళ్లీ ప్రయత్నించండి." : "The note could not be saved. Please try again." });
      return;
    }
    setItems((previous) =>
      previous.map((item) =>
        String(item.profile?.tsap_id) === profileId
          ? { ...item, note, note_at: new Date().toISOString() }
          : item,
      ),
    );
    setDrafts((previous) => ({ ...previous, [profileId]: note }));
    setNotice({ tone: "ok", text: te ? "నోట్ save అయ్యింది — ఇది మీకు మాత్రమే కనిపిస్తుంది." : "Note saved — only you can see it." });
  };

  const remove = async (profileId: string) => {
    setRemovingId(profileId);
    setNotice(null);
    const { ok } = await apiPost<{ saved?: boolean }>("/api/save", { tsap_id: myId, saved_id: profileId });
    setRemovingId("");
    if (!ok) {
      setNotice({ tone: "error", text: te ? "తీసివేయడం సాధ్యపడలేదు. మళ్లీ ప్రయత్నించండి." : "Could not remove it. Please try again." });
      return;
    }
    setItems((previous) => previous.filter((item) => String(item.profile?.tsap_id) !== profileId));
  };

  if (unauthorized || (!loading && !myId)) {
    return <AuthGate note={te ? "మీ shortlist, నోట్స్ చూడటానికి లాగిన్ అవ్వండి." : "Log in to see your shortlist and notes."} />;
  }

  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8" aria-labelledby="shortlist-title">
      <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge icon={<span aria-hidden="true">❤️</span>}>{te ? "షార్ట్‌లిస్ట్" : "Shortlist"}</Badge>
          <h1 id="shortlist-title" className="mt-2 text-xl font-extrabold text-maroon sm:text-2xl">
            {te ? "మీ షార్ట్‌లిస్ట్" : "Your shortlist"}
          </h1>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-600 sm:text-sm">
            {te
              ? "మీరు save చేసిన ప్రొఫైళ్లు మరియు వాటిపై మీ సొంత నోట్స్. ఇవి మీకు మాత్రమే కనిపిస్తాయి — ఆ ప్రొఫైల్ యజమానికి లేదా ఇతర సభ్యులకు కాదు."
              : "Profiles you saved, with your own private notes. Only you can see them — never the profile owner or other members."}
          </p>
        </div>
        <Link
          href="/matches"
          className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full border border-maroon/30 px-4 py-2 text-xs font-bold text-maroon"
        >
          {te ? "ఇంకా వెతకండి →" : "Keep browsing →"}
        </Link>
      </div>

      {notice && (
        <p
          role="status"
          className={`mb-4 rounded-2xl border px-3.5 py-2.5 text-xs font-semibold ${
            notice.tone === "ok"
              ? "border-emerald-300 bg-emerald-50 text-emerald-800"
              : "border-rose-300 bg-rose-50 text-rose-800"
          }`}
        >
          {notice.text}
        </p>
      )}

      {loading ? (
        <CardSkeletonList n={3} />
      ) : loadError ? (
        <EmptyState
          icon="📡"
          title={te ? "షార్ట్‌లిస్ట్ లోడ్ కాలేదు" : "We couldn't load your shortlist"}
          description={te ? "కనెక్షన్ తనిఖీ చేసి మళ్లీ ప్రయత్నించండి." : "Check your connection and try again."}
          action={
            <Button variant="outline" onClick={() => setAttempt((value) => value + 1)}>
              {te ? "మళ్లీ ప్రయత్నించండి" : "Retry"}
            </Button>
          }
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon="💍"
          title={te ? "షార్ట్‌లిస్ట్ ఖాళీగా ఉంది" : "Your shortlist is empty"}
          description={
            te
              ? "సంబంధాలు వెతుకుతున్నప్పుడు ❤️ నొక్కి ప్రొఫైళ్లను ఇక్కడ దాచుకోండి."
              : "Tap the heart while browsing to keep profiles here."
          }
          action={
            <Button href="/matches" variant="secondary">
              {te ? "సంబంధాలు చూడండి" : "Browse matches"}
            </Button>
          }
        />
      ) : (
        <ul className="space-y-3">
          {items.map((item) => {
            const profile = item.profile || {};
            const id = String(profile.tsap_id || "");
            const draft = drafts[id] || "";
            const isSaving = savingId === id;
            const isRemoving = removingId === id;
            const meta = [profile.age ? `${profile.age}${te ? " సం." : "y"}` : "", profile.caste, profile.district]
              .filter(Boolean)
              .join(" · ");
            return (
              <li key={id}>
                <Card>
                  <CardBody>
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <div className="flex items-start gap-3 sm:w-52 sm:shrink-0">
                        <div className="grid h-20 w-16 shrink-0 place-items-center overflow-hidden rounded-xl border border-gold/40 bg-gradient-to-br from-rose-100 to-amber-50 text-2xl">
                          {profile.photo_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={profile.photo_url} alt="" className="h-full w-full object-cover" loading="lazy" />
                          ) : (
                            <span aria-hidden="true">💍</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <Link href={`/search/${encodeURIComponent(id)}`} className="break-words text-sm font-extrabold text-navy hover:text-maroon">
                            {profile.full_name || id}
                          </Link>
                          <p className="break-all font-mono text-[10px] text-slate-500">{id}</p>
                          {meta && <p className="mt-0.5 break-words text-[11px] font-semibold text-slate-600">{meta}</p>}
                          {item.saved_at && (
                            <p className="mt-0.5 text-[10px] text-slate-500">
                              {te ? "జత చేసిన తేదీ" : "Saved"}: {formatDate(item.saved_at, te)}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="min-w-0 flex-1">
                        <Field
                          id={`note-${id}`}
                          label={te ? "నా ప్రైవేట్ నోట్" : "My private note"}
                          hint={
                            te
                              ? "ఇది మీకు మాత్రమే — ఆ ప్రొఫైల్ యజమానికి పంపబడదు."
                              : "Only you see this — it is never sent to the profile owner."
                          }
                        >
                          {({ controlId, describedBy }) => (
                            <textarea
                              id={controlId}
                              className="ds-control"
                              maxLength={NOTE_MAX}
                              value={draft}
                              aria-describedby={describedBy}
                              placeholder={te ? "ఉదా: ఆదివారం సాయంత్రం మాట్లాడాలి" : "e.g. call back after 6pm on Sunday"}
                              onChange={(event) =>
                                setDrafts((previous) => ({ ...previous, [id]: event.target.value }))
                              }
                            />
                          )}
                        </Field>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <Button
                            variant="secondary"
                            loading={isSaving}
                            disabled={isRemoving}
                            onClick={() => void saveNote(id)}
                          >
                            {te ? "నోట్ సేవ్" : "Save note"}
                          </Button>
                          {draft !== "" && (
                            <Button
                              variant="ghost"
                              disabled={isSaving || isRemoving}
                              onClick={() => {
                                setDrafts((previous) => ({ ...previous, [id]: "" }));
                                void saveNote(id, "");
                              }}
                            >
                              {te ? "నోట్ తొలగించు" : "Clear note"}
                            </Button>
                          )}
                          <span className="ml-auto text-[10px] text-slate-500">
                            {draft.length}/{NOTE_MAX}
                          </span>
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-wrap gap-2 sm:w-32 sm:flex-col">
                        <Button href={`/search/${encodeURIComponent(id)}`} variant="outline" block>
                          {te ? "ప్రొఫైల్" : "Profile"}
                        </Button>
                        <Button
                          variant="ghost"
                          block
                          loading={isRemoving}
                          disabled={isSaving}
                          onClick={() => void remove(id)}
                        >
                          {te ? "తీసివేయి" : "Remove"}
                        </Button>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
