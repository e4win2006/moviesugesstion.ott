"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Clapperboard, ExternalLink, EyeOff, Heart, Play, Star, ThumbsDown, ThumbsUp } from "lucide-react";
import type { ScoredTitle } from "@/lib/recommendations";
import { posterUrl } from "@/lib/utils";
import { ScoreRing } from "@/components/score-ring";

export function RecommendationCard({ item, featured = false }: { item: ScoredTitle; featured?: boolean }) {
  const initiallyFavorite = item.feedback?.some((feedback) => feedback.type === "FAVORITE");
  const [currentId, setCurrentId] = useState<string | undefined>(item.id);
  const [state, setState] = useState<"idle" | "liked" | "favorite" | "hidden" | "watched">(initiallyFavorite ? "favorite" : "idle");
  const [explanation, setExplanation] = useState(item.reason);
  const [loadingExplain, setLoadingExplain] = useState(false);
  const [isAiExplained, setIsAiExplained] = useState(false);
  const image = posterUrl(item.posterPath);

  async function action(kind: "LIKE" | "DISLIKE" | "FAVORITE" | "HIDDEN" | "WATCHED") {
    if (currentId && currentId.startsWith("demo-")) {
      setState(kind === "FAVORITE" ? "favorite" : kind === "LIKE" ? "liked" : kind === "WATCHED" ? "watched" : "hidden");
      return;
    }
    const body = currentId 
      ? { titleId: currentId, action: kind }
      : { tmdbId: item.tmdbId, type: item.type, action: kind };

    const response = await fetch("/api/feedback", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (response.ok) {
      const resData = await response.json();
      if (resData.titleId) {
        setCurrentId(resData.titleId);
      }
      setState(kind === "FAVORITE" ? "favorite" : kind === "LIKE" ? "liked" : kind === "WATCHED" ? "watched" : "hidden");
    }
  }

  async function explain() {
    if (!currentId || currentId.startsWith("demo-")) return;
    setLoadingExplain(true);
    try {
      const response = await fetch(`/api/recommendations/${currentId}/explain`, {
        method: "POST",
      });
      if (response.ok) {
        const data = await response.json();
        if (data.explanation) {
          setExplanation(data.explanation);
          setIsAiExplained(true);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingExplain(false);
    }
  }

  if (state === "hidden" || state === "watched") {
    return (
      <div className="glass grid aspect-[2/3] min-w-0 place-items-center rounded-2xl p-5 text-center">
        <div>
          <Check className="mx-auto mb-2 text-lime" />
          <p className="text-sm font-bold">{state === "watched" ? "Added to history" : "Hidden from recommendations"}</p>
        </div>
      </div>
    );
  }

  return (
    <article className={`group relative overflow-hidden rounded-2xl bg-panel ${featured ? "min-h-[400px]" : "aspect-[2/3]"}`}>
      <div
        className="absolute inset-0 bg-zinc-900 bg-cover bg-center transition duration-500 group-hover:scale-105"
        style={image ? { backgroundImage: `url("${image}")` } : undefined}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent" />
      <div className="absolute left-3 top-3"><ScoreRing score={item.score} size="sm" /></div>
      {item.completedSeries && <span className="absolute right-3 top-3 rounded-full bg-black/70 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-lime backdrop-blur">Completed</span>}
      <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4 transition duration-300 sm:translate-y-9 sm:group-hover:translate-y-0 bg-gradient-to-t from-black via-black/80 to-transparent">
        <h3 className="text-sm sm:text-base font-black leading-tight truncate">{item.title}</h3>
        <div className="mt-1 flex items-center gap-2 text-[10px] font-bold text-zinc-300">
          <span>{item.year}</span>
          <span className="flex items-center gap-1"><Star size={10} fill="#f4c542" className="text-yellow-400" /> {item.imdbRating?.toFixed(1) || "—"}</span>
          <span className="text-red-400">● {item.rottenTomatoesScore || "—"}%</span>
        </div>
        <div className="mt-1.5 text-[10px] leading-4 text-zinc-300 hidden sm:block">
          <p className="line-clamp-2">{explanation}</p>
          {!isAiExplained && currentId && !currentId.startsWith("demo-") && (
            <button
              onClick={explain}
              disabled={loadingExplain}
              className="mt-1 text-[9px] text-lime hover:underline font-bold flex items-center gap-1"
            >
              {loadingExplain ? "Generating..." : "✨ AI Explain"}
            </button>
          )}
        </div>
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          <a href={item.trailerUrl || `https://www.youtube.com/results?search_query=${encodeURIComponent(item.title + " trailer")}`} target="_blank" rel="noreferrer" className="flex h-7 sm:h-8 items-center justify-center gap-1 rounded-lg bg-white text-[9px] sm:text-[10px] font-black text-black active:scale-95"><Play size={10} fill="currentColor" /> Trailer</a>
          <a href={`/api/watch/jiohotstar?title=${encodeURIComponent(item.title)}&type=${item.type === "MOVIE" ? "movie" : "tv"}`} target="_blank" rel="noreferrer" title={`Search for ${item.title} on JioHotstar India`} className="flex h-7 sm:h-8 items-center justify-center gap-1 rounded-lg bg-lime text-[9px] font-black text-ink active:scale-95"><Clapperboard size={10} /> JioHotstar</a>
          <a href={`/api/watch/imdb?title=${encodeURIComponent(item.title)}&year=${item.year || ""}&imdbId=${item.imdbId || ""}`} target="_blank" rel="noreferrer" title="Open this title's IMDb watch options" className="flex h-7 sm:h-8 items-center justify-center gap-1 rounded-lg bg-[#f5c518] text-[9px] font-black text-black active:scale-95"><ExternalLink size={10} /> IMDb</a>
          <Link href={`/player?tmdbId=${item.tmdbId}&type=${item.type === "MOVIE" ? "movie" : "tv"}`} className="flex h-7 sm:h-8 items-center justify-center gap-1 rounded-lg bg-white/15 text-[9px] font-black active:scale-95"><Play size={10} fill="currentColor" /> VLC Web</Link>
        </div>
        <div className="mt-1.5 flex items-center gap-1.5">
          <button onClick={() => action("LIKE")} className={`grid h-7 w-7 sm:h-8 sm:w-8 place-items-center rounded-full bg-white/15 active:scale-90 transition ${state === "liked" ? "text-lime" : ""}`} aria-label="Like"><ThumbsUp size={12} /></button>
          <button onClick={() => action("DISLIKE")} className="grid h-7 w-7 sm:h-8 sm:w-8 place-items-center rounded-full bg-white/15 active:scale-90 transition" aria-label="Dislike"><ThumbsDown size={12} /></button>
          <button onClick={() => action("WATCHED")} className="grid h-7 w-7 sm:h-8 sm:w-8 place-items-center rounded-full bg-white/15 active:scale-90 transition" aria-label="Mark watched"><Check size={13} /></button>
          <button onClick={() => action("HIDDEN")} className="grid h-7 w-7 sm:h-8 sm:w-8 place-items-center rounded-full bg-white/15 active:scale-90 transition" aria-label="Hide"><EyeOff size={12} /></button>
          <button onClick={() => action("FAVORITE")} className={`ml-auto grid h-7 w-7 sm:h-8 sm:w-8 place-items-center rounded-full bg-white/15 active:scale-90 transition ${state === "favorite" ? "text-red-400" : ""}`} aria-label="Add to favorites"><Heart size={12} fill={state === "favorite" ? "currentColor" : "none"} /></button>
        </div>
      </div>
    </article>
  );
}
