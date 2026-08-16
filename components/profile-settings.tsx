"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, LogOut, Save } from "lucide-react";
import { PREFERRED_GENRES } from "@/lib/constants";

const languages = [
  { code: "en", name: "English" },
  { code: "ml", name: "Malayalam" },
  { code: "ta", name: "Tamil" },
  { code: "te", name: "Telugu" },
  { code: "hi", name: "Hindi" },
  { code: "kn", name: "Kannada" },
  { code: "de", name: "German" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
];

const watchProviders = [
  "JioHotstar",
  "Hotstar",
  "JioCinema",
  "Netflix",
  "Prime Video",
  "Apple TV",
  "SonyLIV",
  "ZEE5"
];

export function ProfileSettings({
  initialGenres,
  initialPreferredLanguages,
  initialExcludedLanguages,
  initialWatchProviders,
}: {
  initialGenres: string[];
  initialPreferredLanguages: string[];
  initialExcludedLanguages: string[];
  initialWatchProviders: string[];
}) {
  const router = useRouter();
  const [genres, setGenres] = useState(initialGenres);
  const [preferredLanguages, setPreferredLanguages] = useState(initialPreferredLanguages);
  const [excludedLanguages, setExcludedLanguages] = useState(initialExcludedLanguages);
  const [watchProvidersState, setWatchProvidersState] = useState(initialWatchProviders);
  const [saved, setSaved] = useState(false);

  function toggleGenre(genre: string) {
    setSaved(false);
    setGenres((current) => current.includes(genre) ? current.filter((item) => item !== genre) : [...current, genre]);
  }

  function togglePreferredLanguage(code: string) {
    setSaved(false);
    setPreferredLanguages((current) => {
      if (current.includes(code)) {
        return current.filter((item) => item !== code);
      } else {
        setExcludedLanguages((ex) => ex.filter((item) => item !== code));
        return [...current, code];
      }
    });
  }

  function toggleExcludedLanguage(code: string) {
    setSaved(false);
    setExcludedLanguages((current) => {
      if (current.includes(code)) {
        return current.filter((item) => item !== code);
      } else {
        setPreferredLanguages((pref) => pref.filter((item) => item !== code));
        return [...current, code];
      }
    });
  }

  function toggleWatchProvider(provider: string) {
    setSaved(false);
    setWatchProvidersState((current) => current.includes(provider) ? current.filter((item) => item !== provider) : [...current, provider]);
  }

  async function save() {
    const response = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        favoriteGenres: genres,
        preferredLanguages,
        excludedLanguages,
        preferredWatchProviders: watchProvidersState,
      }),
    });
    if (response.ok) {
      setSaved(true);
      router.refresh();
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <>
      <section className="glass mt-6 rounded-3xl p-6 sm:p-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="eyebrow">Taste profile</p>
            <h2 className="mt-2 text-xl font-black">Favorite genres & signals</h2>
          </div>
          <button onClick={save} className="flex items-center gap-2 rounded-xl bg-lime px-4 py-2.5 text-xs font-black text-ink">
            {saved ? <Check size={14} /> : <Save size={14} />} {saved ? "Saved" : "Save"}
          </button>
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          {PREFERRED_GENRES.map((genre) => (
            <button key={genre} onClick={() => toggleGenre(genre)} className={`rounded-full border px-3 py-2 text-xs font-bold transition ${genres.includes(genre) ? "border-lime/50 bg-lime/10 text-lime" : "border-white/10 text-zinc-500"}`}>
              {genre}
            </button>
          ))}
        </div>
      </section>

      <section className="glass mt-5 rounded-3xl p-6 sm:p-8">
        <p className="eyebrow">Language preferences</p>
        <p className="mt-1 text-xs text-zinc-500">Enable preferred languages for suggestions, and set strict exclusions for languages you do not want to see recommendations for.</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {languages.map((lang) => {
            const isPreferred = preferredLanguages.includes(lang.code);
            const isExcluded = excludedLanguages.includes(lang.code);
            return (
              <div key={lang.code} className="flex items-center justify-between rounded-2xl bg-white/[.03] p-4 border border-white/[.05]">
                <div>
                  <p className="font-black text-sm">{lang.name}</p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">{lang.code.toUpperCase()}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => togglePreferredLanguage(lang.code)}
                    className={`rounded-lg px-2.5 py-1.5 text-[10px] font-black transition ${isPreferred ? "bg-lime text-ink" : "bg-white/10 text-zinc-400 hover:text-white"}`}
                  >
                    Preferred
                  </button>
                  <button
                    onClick={() => toggleExcludedLanguage(lang.code)}
                    className={`rounded-lg px-2.5 py-1.5 text-[10px] font-black transition ${isExcluded ? "bg-red-500 text-white" : "bg-white/10 text-zinc-400 hover:text-red-300"}`}
                  >
                    Exclude
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="glass mt-5 rounded-3xl p-6 sm:p-8">
        <p className="eyebrow">Streaming services in India</p>
        <p className="mt-1 text-xs text-zinc-500">Toggle the streaming services you actively subscribe to or prefer. Recommendations on these providers will take precedence.</p>
        <div className="mt-5 flex flex-wrap gap-2">
          {watchProviders.map((provider) => {
            const active = watchProvidersState.includes(provider);
            return (
              <button
                key={provider}
                onClick={() => toggleWatchProvider(provider)}
                className={`rounded-full border px-3.5 py-2 text-xs font-bold transition ${active ? "border-lime/50 bg-lime/10 text-lime" : "border-white/10 text-zinc-500 hover:text-zinc-300"}`}
              >
                {provider}
              </button>
            );
          })}
        </div>
      </section>

      <button onClick={logout} className="mt-5 flex items-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-xs font-bold text-zinc-400 hover:border-red-400/30 hover:text-red-300"><LogOut size={14} /> Sign out</button>
    </>
  );
}
