"use client";

/**
 * GenreBrowser — live paginated content explorer
 * ─────────────────────────────────────────────────────────────────────────────
 * Fetches content from /api/catalog with real-time filters:
 *   - Media type toggle: All / Movies / Shows
 *   - Language filter: English / Malayalam / British
 *   - Genre pills (24 genres)
 *   - Sort: IMDb · RT · Year · Match Score · Popularity
 *   - View: Grid | Genre Shelves
 *   - Infinite "Load More" pagination (50 items/page)
 *   - Neural-net score badge next to match score
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, Film, Layers, Loader2, Search, Star, Tv, Wifi, WifiOff, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { posterUrl } from "@/lib/utils";
import { useNeuralRecommender } from "@/components/neural-recommender-provider";
import type { TitleFeatures } from "@/lib/neural-net";

// ─── Genre list ───────────────────────────────────────────────────────────────

const GENRES = [
  "Action", "Adventure", "Animation", "Comedy", "Crime", "Documentary",
  "Drama", "Family", "Fantasy", "History", "Horror", "Mystery",
  "Science Fiction", "Thriller", "War", "Western",
  "Cybersecurity", "Hacking", "Tech Drama",
  "Government Conspiracy", "Political Thriller",
  "Intelligence Agencies", "Artificial Intelligence",
];

const SORT_OPTIONS = [
  { id: "rating", label: "IMDb Rating" },
  { id: "rt", label: "Rotten Tomatoes" },
  { id: "year", label: "Release Year" },
  { id: "score", label: "Match Score" },
  { id: "popularity", label: "Popularity" },
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface CatalogItem {
  id: string;
  tmdbId?: number;
  type: "MOVIE" | "TV";
  title: string;
  year?: number | null;
  language: string;
  genres: string[];
  keywords?: string[];
  posterPath?: string | null;
  backdropPath?: string | null;
  imdbRating?: number | null;
  tmdbRating?: number | null;
  rottenTomatoesScore?: number | null;
  popularity?: number | null;
  score: number;
  reason?: string;
  overview?: string | null;
  trailerUrl?: string | null;
}

// ─── Individual Card ──────────────────────────────────────────────────────────

function TitleCard({ item }: { item: CatalogItem }) {
  const { getScore, trainFeedback } = useNeuralRecommender();
  const features: TitleFeatures = {
    genres: item.genres,
    keywords: item.keywords,
    language: item.language,
    imdbRating: item.imdbRating,
    rottenTomatoesScore: item.rottenTomatoesScore,
    tmdbRating: item.tmdbRating,
    popularity: item.popularity,
    year: item.year,
    type: item.type,
  };
  const nnScore = getScore(features);
  const rating = item.imdbRating ?? item.tmdbRating;
  const poster = posterUrl(item.posterPath, "w342");
  const trailerHref =
    item.trailerUrl ||
    `https://www.youtube.com/results?search_query=${encodeURIComponent(item.title + " official trailer")}`;

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/[.06] bg-white/[.03] transition hover:border-lime/30 hover:bg-white/[.06]">
      {/* Poster */}
      <div className="relative aspect-[2/3] overflow-hidden bg-zinc-900">
        {poster ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={poster}
            alt={item.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-zinc-700">
            <Film size={40} />
          </div>
        )}
        {/* Neural score badge */}
        <div className="absolute left-2 top-2 flex items-center gap-1 rounded-lg bg-black/70 px-2 py-1 text-[10px] font-black backdrop-blur-sm">
          <Zap size={9} className="text-lime" />
          <span className="text-lime">{nnScore}</span>
        </div>
        {/* Type badge */}
        <span className="absolute right-2 top-2 rounded-md bg-black/70 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-zinc-300 backdrop-blur-sm">
          {item.type === "MOVIE" ? "Movie" : "Series"}
        </span>
        {/* Hover overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/70 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <a
            href={trailerHref}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg bg-lime px-3 py-1.5 text-[11px] font-black text-ink"
          >
            ▶ Trailer
          </a>
          <a
            href={`/api/watch/jiohotstar?title=${encodeURIComponent(item.title)}&type=${item.type === "MOVIE" ? "movie" : "tv"}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-bold"
          >
            Watch Now
          </a>
          <div className="mt-1 flex gap-2">
            {(["LIKE", "FAVORITE", "DISLIKE"] as const).map((fb) => (
              <button
                key={fb}
                onClick={() => trainFeedback(features, fb)}
                className={cn(
                  "rounded-md px-2 py-1 text-[9px] font-bold uppercase transition",
                  fb === "FAVORITE"
                    ? "bg-lime/20 text-lime hover:bg-lime/30"
                    : fb === "LIKE"
                      ? "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
                      : "bg-red-500/20 text-red-400 hover:bg-red-500/30",
                )}
                title={`Train AI: ${fb}`}
              >
                {fb === "FAVORITE" ? "★ Fav" : fb === "LIKE" ? "👍" : "👎"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col p-3">
        <p className="line-clamp-2 text-[12px] font-bold leading-snug">{item.title}</p>
        <p className="mt-1 text-[10px] text-zinc-500">
          {item.year} · {item.language.toUpperCase()}
        </p>
        <div className="mt-auto flex items-center gap-2 pt-2">
          {rating != null && (
            <span className="flex items-center gap-0.5 text-[10px] font-bold text-yellow-400">
              <Star size={9} fill="currentColor" />
              {rating.toFixed(1)}
            </span>
          )}
          {item.rottenTomatoesScore != null && (
            <span className="text-[10px] font-bold text-red-400">
              {item.rottenTomatoesScore}% RT
            </span>
          )}
          <span className="ml-auto text-[10px] text-zinc-500">
            Match {item.score}%
          </span>
        </div>
        {/* Genre pills */}
        <div className="mt-2 flex flex-wrap gap-1">
          {item.genres.slice(0, 3).map((g) => (
            <span
              key={g}
              className="rounded-full bg-white/[.06] px-2 py-0.5 text-[9px] text-zinc-400"
            >
              {g}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Shelf row (genre view) ───────────────────────────────────────────────────

function ShelfRow({ genre, items }: { genre: string; items: CatalogItem[] }) {
  const visible = items.slice(0, 10);
  if (!visible.length) return null;
  return (
    <div className="mt-8">
      <h2 className="mb-3 text-sm font-black uppercase tracking-widest text-lime">
        {genre}
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {visible.map((item) => (
          <TitleCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}

// ─── Main browser ─────────────────────────────────────────────────────────────

export function GenreBrowser({ initialHasTmdb }: { initialHasTmdb?: boolean }) {
  // Filter state
  const [mediaType, setMediaType] = useState<"ALL" | "MOVIE" | "TV">("ALL");
  const [langFilter, setLangFilter] = useState<"" | "en" | "ml" | "brit">("");
  const [selectedGenre, setSelectedGenre] = useState("");
  const [sortBy, setSortBy] = useState("rating");
  const [viewMode, setViewMode] = useState<"grid" | "shelves">("grid");
  const [localSearch, setLocalSearch] = useState("");

  // Data state
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasTmdb, setHasTmdb] = useState(initialHasTmdb ?? false);
  const abortRef = useRef<AbortController | null>(null);

  const fetchItems = useCallback(
    async (pg: number, append = false) => {
      // Cancel any in-flight request
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      if (append) setLoadingMore(true);
      else setLoading(true);

      const params = new URLSearchParams({
        type: mediaType,
        sort: sortBy,
        page: String(pg),
      });
      if (selectedGenre) params.set("genre", selectedGenre);
      if (langFilter) params.set("lang", langFilter);

      try {
        const res = await fetch(`/api/catalog?${params}`, {
          signal: ctrl.signal,
        });
        if (!res.ok) throw new Error("catalog fetch failed");
        const data = await res.json();
        if (append) {
          setItems((prev) => [...prev, ...(data.items || [])]);
        } else {
          setItems(data.items || []);
        }
        setHasMore(data.hasMore ?? false);
        setTotal(data.total ?? 0);
        setHasTmdb(data.hasTmdb ?? false);
        setPage(pg);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          console.warn("Catalog fetch error", err);
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [mediaType, sortBy, selectedGenre, langFilter],
  );

  // Re-fetch when any filter changes
  useEffect(() => {
    fetchItems(1, false);
  }, [fetchItems]);

  // Local client-side search on top of fetched items
  const displayed = localSearch.trim()
    ? items.filter(
        (item) =>
          item.title.toLowerCase().includes(localSearch.toLowerCase()) ||
          item.genres.some((g) =>
            g.toLowerCase().includes(localSearch.toLowerCase()),
          ),
      )
    : items;

  // Group by genre for shelves view
  const byGenre = React.useMemo(() => {
    const map = new Map<string, CatalogItem[]>();
    for (const item of displayed) {
      for (const g of item.genres.slice(0, 2)) {
        if (!map.has(g)) map.set(g, []);
        map.get(g)!.push(item);
      }
    }
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [displayed]);

  return (
    <div className="mt-6" suppressHydrationWarning>
      {/* ── Toolbar ── */}
      <div className="sticky top-16 z-30 -mx-4 mb-4 border-b border-white/[.06] bg-[#090b0f]/95 px-4 pb-3 pt-2 backdrop-blur-xl sm:-mx-7 sm:px-7">
        {/* Row 1: type + lang + view toggle */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Media type */}
          <div className="flex rounded-xl border border-white/10 p-0.5">
            {(["ALL", "MOVIE", "TV"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setMediaType(t)}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-bold transition",
                  mediaType === t
                    ? "bg-lime text-ink"
                    : "text-zinc-400 hover:text-white",
                )}
              >
                {t === "MOVIE" ? <Film size={12} /> : t === "TV" ? <Tv size={12} /> : null}
                {t === "ALL" ? "All" : t === "MOVIE" ? "Movies" : "Shows"}
              </button>
            ))}
          </div>

          {/* Language filter */}
          <div className="flex rounded-xl border border-white/10 p-0.5">
            {([["", "All Lang"], ["en", "English"], ["ml", "Malayalam"], ["brit", "British"]] as const).map(
              ([val, label]) => (
                <button
                  key={val}
                  onClick={() => setLangFilter(val as "" | "en" | "ml" | "brit")}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-[11px] font-bold transition",
                    langFilter === val
                      ? "bg-white/15 text-white"
                      : "text-zinc-500 hover:text-white",
                  )}
                >
                  {label}
                </button>
              ),
            )}
          </div>

          {/* Sort */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="flex appearance-none items-center gap-1.5 rounded-xl border border-white/10 bg-transparent px-3 py-1.5 pr-7 text-[11px] font-bold text-zinc-300 focus:outline-none"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  Sort: {o.label}
                </option>
              ))}
            </select>
            <ChevronDown
              size={12}
              className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500"
            />
          </div>

          {/* View toggle */}
          <div className="ml-auto flex gap-1">
            <button
              onClick={() => setViewMode("grid")}
              className={cn(
                "rounded-lg p-2 transition",
                viewMode === "grid" ? "bg-white/10 text-white" : "text-zinc-600 hover:text-white",
              )}
              title="Grid view"
            >
              <Film size={15} />
            </button>
            <button
              onClick={() => setViewMode("shelves")}
              className={cn(
                "rounded-lg p-2 transition",
                viewMode === "shelves"
                  ? "bg-white/10 text-white"
                  : "text-zinc-600 hover:text-white",
              )}
              title="Genre shelves"
            >
              <Layers size={15} />
            </button>
          </div>
        </div>

        {/* Row 2: Genre pills */}
        <div className="mt-2 flex flex-wrap gap-1.5">
          <button
            onClick={() => setSelectedGenre("")}
            className={cn(
              "rounded-full border px-3 py-1 text-[11px] font-semibold transition",
              !selectedGenre
                ? "border-lime bg-lime/10 text-lime"
                : "border-white/10 text-zinc-500 hover:border-white/20 hover:text-zinc-300",
            )}
          >
            All Genres
          </button>
          {GENRES.map((g) => (
            <button
              key={g}
              onClick={() => setSelectedGenre(selectedGenre === g ? "" : g)}
              className={cn(
                "rounded-full border px-3 py-1 text-[11px] font-semibold transition",
                selectedGenre === g
                  ? "border-lime bg-lime/10 text-lime"
                  : "border-white/10 text-zinc-500 hover:border-white/20 hover:text-zinc-300",
              )}
            >
              {g}
            </button>
          ))}
        </div>

        {/* Row 3: local search + status */}
        <div className="mt-2 flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search
              size={13}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600"
            />
            <input
              type="text"
              placeholder="Filter displayed results…"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/[.04] py-2 pl-8 pr-3 text-xs placeholder:text-zinc-600 focus:border-lime/40 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-zinc-600">
            {hasTmdb ? (
              <>
                <Wifi size={11} className="text-lime" />
                <span className="text-lime">Live · TMDB</span>
              </>
            ) : (
              <>
                <WifiOff size={11} className="text-amber-500" />
                <span className="text-amber-500">Demo mode</span>
              </>
            )}
            {total > 0 && (
              <span className="ml-1 text-zinc-700">· {total} titles</span>
            )}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 size={28} className="animate-spin text-lime" />
        </div>
      ) : displayed.length === 0 ? (
        <div className="flex h-48 flex-col items-center justify-center gap-2 text-center text-zinc-600">
          <Film size={36} />
          <p className="text-sm font-semibold">No titles found</p>
          <p className="text-xs">
            {hasTmdb
              ? "Try a different genre or filter combination."
              : "Add a TMDB API key to unlock live content."}
          </p>
        </div>
      ) : viewMode === "shelves" ? (
        byGenre.map(([genre, genreItems]) => (
          <ShelfRow key={genre} genre={genre} items={genreItems} />
        ))
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {displayed.map((item) => (
            <TitleCard key={item.id} item={item} />
          ))}
        </div>
      )}

      {/* ── Load More ── */}
      {hasMore && !localSearch && (
        <div className="mt-8 flex justify-center">
          <button
            onClick={() => fetchItems(page + 1, true)}
            disabled={loadingMore}
            className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[.04] px-6 py-3 text-xs font-bold transition hover:border-lime/30 hover:bg-white/[.07] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loadingMore ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <ChevronDown size={14} />
            )}
            {loadingMore ? "Loading…" : `Load More (${total - items.length} remaining)`}
          </button>
        </div>
      )}
    </div>
  );
}
