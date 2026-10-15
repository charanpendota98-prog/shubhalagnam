"use client";

import { apiDisplayMessage, readApiJson } from "@/lib/api";
/** Admin-curated story cards. Publication review is not identity or relationship verification. */
import { useEffect, useState } from "react";
import Image from "next/image";
import { Duo } from "@/lib/duo";
import { useLang } from "@/lib/lang";

type Story = {
  id: string;
  groom?: string;
  bride?: string;
  photo?: string;
  story_en?: string;
  story_te?: string;
  district?: string;
  wedding_date?: string;
  tags?: string[];
};

export default function FeaturedStories({ limit = 6 }: { limit?: number }) {
  const { lang } = useLang();
  const te = lang === "te";
  const [items, setItems] = useState<Story[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tag, setTag] = useState("");
  useEffect(() => {
    let active = true;
    fetch(`/api/cms/stories?limit=${limit}${tag ? `&tag=${encodeURIComponent(tag)}` : ""}`)
      .then((response) => readApiJson(response))
      .then((data) => {
        if (!active) return;
        if (data?.success) {
          setItems(Array.isArray(data.stories) ? data.stories : []);
          if (Array.isArray(data.tags)) setTags(data.tags);
        }
      })
      .catch(() => { if (active) setItems([]); });
    return () => { active = false; };
  }, [tag, limit]);

  if (!items.length && !tag) return null;
  const name = (story: Story) => [story.groom, story.bride].filter(Boolean).join(" ♥ ");
  const visibleTags = te
    ? tags
    : tags.map((itemTag) => apiDisplayMessage({ message_en: itemTag }, false, "")).filter(Boolean);

  return (
    <section aria-labelledby="featured-stories-title">
      <h2 id="featured-stories-title" className="text-xl font-extrabold text-rose-900">
        💬 <Duo en="Member-shared stories" te="సభ్యులు పంచుకున్న కథనాలు" />
      </h2>
      <p className="mt-1 text-xs leading-relaxed text-gray-600">
        <Duo
          en="Stories are selected for publication. Editorial review does not independently verify identity, relationship details, wedding dates, or photos."
          te="ప్రచురణ కోసం కథనాలను ఎంపిక చేస్తారు. సంపాదకీయ సమీక్ష గుర్తింపు, సంబంధ వివరాలు, పెళ్లి తేదీలు లేదా ఫోటోలను స్వతంత్రంగా నిర్ధారించదు."
        />
      </p>
      {visibleTags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5" aria-label={te ? "కథనాల ట్యాగ్‌లతో వడపోత" : "Filter stories by tag"}>
          <button type="button" aria-pressed={!tag} onClick={() => setTag("")}
            className={`chip !py-1 !text-[11px] ${!tag ? "chip-on" : ""}`}>
            {te ? "అన్నీ" : "All"}
          </button>
          {visibleTags.slice(0, 10).map((itemTag) => (
            <button key={itemTag} type="button" aria-pressed={tag === itemTag}
              onClick={() => setTag(tag === itemTag ? "" : itemTag)}
              className={`chip !py-1 !text-[11px] ${tag === itemTag ? "chip-on" : ""}`}>
              #{itemTag}
            </button>
          ))}
        </div>
      )}
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {items.map((story) => {
          const englishStory = apiDisplayMessage({ message_en: story.story_en }, false, "");
          const storyTags = te
            ? story.tags || []
            : (story.tags || []).map((itemTag) => apiDisplayMessage({ message_en: itemTag }, false, "")).filter(Boolean);
          const displayDistrict = te ? story.district : apiDisplayMessage({ message_en: story.district }, false, "");
          const displayDate = te ? story.wedding_date : apiDisplayMessage({ message_en: story.wedding_date }, false, "");
          return (
          <article key={story.id} className="overflow-hidden rounded-2xl border border-rose-100 bg-white shadow-sm">
            {story.photo ? (
              <Image
                src={story.photo}
                alt={te ? "సభ్యులు పంచుకున్న కథనానికి జతచేసిన ఫోటో; ఇది గుర్తింపు నిర్ధారణ కాదు" : "Photo accompanying a member-shared story; it is not identity verification"}
                width={800}
                height={440}
                unoptimized
                className="h-44 w-full object-cover"
                loading="lazy"
                decoding="async"
              />
            ) : null}
            <div className="p-4">
              {name(story) ? <h3 className="break-words font-bold text-rose-900 text-sm">💬 {name(story)}</h3> : null}
              <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-[11px] text-gray-500">
                {displayDistrict ? <span className="break-words">📍 {displayDistrict}</span> : null}
                {displayDate ? <span>{te ? "సభ్యులు తెలిపిన తేదీ" : "Date shared with story"}: {displayDate}</span> : null}
              </div>
              {te ? (
                story.story_te
                  ? <p lang="te-IN" className="telugu mt-2 whitespace-pre-wrap break-words text-xs leading-relaxed text-gray-700">{story.story_te}</p>
                  : englishStory
                    ? <p lang="en-IN" className="mt-2 whitespace-pre-wrap break-words text-xs leading-relaxed text-gray-600">{englishStory}</p>
                    : null
              ) : englishStory ? (
                <p lang="en-IN" className="mt-2 whitespace-pre-wrap break-words text-xs leading-relaxed text-gray-600">{englishStory}</p>
              ) : story.story_te ? (
                <p lang="en-IN" className="mt-2 text-xs leading-relaxed text-gray-600">An English version of this story is not available. Switch to Telugu to read the original.</p>
              ) : null}
              {storyTags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {storyTags.map((itemTag) => (
                    <button key={itemTag} type="button" aria-label={`${te ? "ట్యాగ్‌తో వడపోత" : "Filter by tag"} ${itemTag}`}
                      onClick={() => setTag(itemTag)}
                      className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] text-rose-700 hover:bg-rose-100">
                      #{itemTag}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </article>
          );
        })}
      </div>
      {!items.length && tag && <p className="mt-3 text-xs text-gray-500"><Duo en="No stories in this tag." te="ఈ tag లో కథనాలు లేవు." /></p>}
    </section>
  );
}
