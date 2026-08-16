import { NextResponse } from "next/server";
import {
  fetchAllContent,
  fetchByGenre,
  fetchMalayalamContent,
  fetchBritishShows,
  fetchAmericanShows,
  fetchHollywoodMovies,
} from "@/lib/content-agent";
import { fallbackTitles } from "@/lib/data";
import { scoreTitle } from "@/lib/recommendations";
import { PREFERRED_GENRES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const genre = searchParams.get("genre")?.trim() || "";
  const type = (searchParams.get("type") || "ALL") as "MOVIE" | "TV" | "ALL";
  const lang = searchParams.get("lang")?.trim() || "";
  const sort = searchParams.get("sort") || "rating";
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const limit = 50;

  const hasTmdb = !!process.env.TMDB_API_KEY;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let raw: any[] = [];

  if (hasTmdb) {
    if (genre) {
      // Genre-specific fetch (handles type filtering internally)
      raw = await fetchByGenre(genre, type, 5);
    } else if (lang === "ml") {
      raw = await fetchMalayalamContent(5);
    } else if (lang === "gb" || lang === "brit") {
      raw = await fetchBritishShows(5);
    } else {
      raw = await fetchAllContent();
    }
  } else {
    // No TMDB key — use expanded static fallback
    raw = [...fallbackTitles];
  }

  // Apply filters
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let filtered: any[] = raw.filter((item) => {
    if (type !== "ALL" && item.type !== type) return false;
    if (lang && lang !== "gb" && lang !== "brit" && item.language !== lang) return false;
    if (genre) {
      const allTags = [...(item.genres || []), ...(item.keywords || [])];
      const matches = allTags.some((t: string) =>
        t.toLowerCase().includes(genre.toLowerCase()),
      );
      if (!matches) return false;
    }
    return true;
  });

  // Score and sort
  const scored = filtered.map((item) =>
    scoreTitle(item, [...PREFERRED_GENRES]),
  );

  scored.sort((a, b) => {
    const aRating = a.imdbRating ?? a.tmdbRating ?? 0;
    const bRating = b.imdbRating ?? b.tmdbRating ?? 0;
    if (sort === "year") {
      return (b.year || 0) - (a.year || 0) || bRating - aRating;
    }
    if (sort === "popularity") {
      return (b.popularity || 0) - (a.popularity || 0);
    }
    if (sort === "imdb") {
      return bRating - aRating || b.score - a.score;
    }
    if (sort === "rt") {
      const aRt = a.rottenTomatoesScore ?? 0;
      const bRt = b.rottenTomatoesScore ?? 0;
      return bRt - aRt || bRating - aRating;
    }
    // Default: match score
    return b.score - a.score || bRating - aRating;
  });

  const total = scored.length;
  const start = (page - 1) * limit;
  const pageItems = scored.slice(start, start + limit);

  return NextResponse.json({
    items: pageItems,
    page,
    total,
    hasMore: start + limit < total,
    hasTmdb,
    source: hasTmdb ? "tmdb-live" : "static-fallback",
  });
}
