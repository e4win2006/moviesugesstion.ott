"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import type { ScoredTitle } from "@/lib/recommendations";
import { RecommendationCard } from "@/components/recommendation-card";

export function SearchBrowser({ items = [] }: { items?: ScoredTitle[] }) {
  const safeItems = items || [];
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ScoredTitle[]>([]);
  const [searching, setSearching] = useState(false);
  const [minImdb, setMinImdb] = useState("0");
  const [language, setLanguage] = useState("all");
  const [genre, setGenre] = useState("all");
  const [completed, setCompleted] = useState(false);

  const genres = useMemo(
    () => [...new Set(safeItems.flatMap((item) => item?.genres || []))].sort(),
    [safeItems]
  );

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (response.ok) {
          const data = await response.json();
          setResults(data.results || []);
        }
      } catch (e) {
        console.error("Search fetch failed", e);
      } finally {
        setSearching(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [query]);

  const activeItems = query.trim() ? results : items;

  const filtered = useMemo(() => activeItems.filter((item) => {
    return (item.imdbRating || 0) >= Number(minImdb)
      && (language === "all" || item.language === language)
      && (genre === "all" || item.genres.includes(genre))
      && (!completed || item.completedSeries);
  }), [activeItems, minImdb, language, genre, completed]);

  return (
    <>
      <div className="glass mt-7 rounded-2xl p-3 sm:flex sm:items-center sm:gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={17} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search local & global TMDB catalog…" className="h-12 w-full rounded-xl bg-black/20 pl-11 pr-4 text-sm outline-none focus:ring-1 focus:ring-lime/50" />
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:mt-0 sm:flex">
          <select value={minImdb} onChange={(event) => setMinImdb(event.target.value)} className="h-12 rounded-xl border border-white/10 bg-[#11141a] px-3 text-xs text-zinc-300">
            <option value="0">Any IMDb</option><option value="7">IMDb 7+</option><option value="8">IMDb 8+</option><option value="8.5">IMDb 8.5+</option>
          </select>
          <select value={genre} onChange={(event) => setGenre(event.target.value)} className="h-12 rounded-xl border border-white/10 bg-[#11141a] px-3 text-xs text-zinc-300">
            <option value="all">All genres</option>{genres.map((value) => <option key={value}>{value}</option>)}
          </select>
          <select value={language} onChange={(event) => setLanguage(event.target.value)} className="h-12 rounded-xl border border-white/10 bg-[#11141a] px-3 text-xs text-zinc-300">
            <option value="all">All allowed languages</option><option value="en">English</option><option value="ml">Malayalam</option><option value="de">Other</option>
          </select>
          <button onClick={() => setCompleted(!completed)} className={`flex h-12 items-center justify-center gap-2 rounded-xl border px-3 text-xs font-bold ${completed ? "border-lime bg-lime/10 text-lime" : "border-white/10 text-zinc-400"}`}><SlidersHorizontal size={14} /> Completed</button>
        </div>
      </div>
      <p className="mt-6 text-xs font-bold text-zinc-500">
        {searching ? "Searching catalog..." : `${filtered.length} titles match`}
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-5 xl:grid-cols-6">
        {filtered.map((item) => <RecommendationCard key={`${item.tmdbId}-${item.type}`} item={item} />)}
      </div>
    </>
  );
}

