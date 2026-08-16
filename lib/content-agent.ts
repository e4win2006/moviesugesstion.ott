/**
 * ContentAgent — live TMDB-backed content discovery
 * Fetches Hollywood movies, British shows, Malayalam & English content
 * sorted by real TMDB rating. Results are cached by Next.js for 6 hours.
 * Gracefully falls back to static data when TMDB_API_KEY is not set.
 */

import { normalizeTmdb, type TmdbMedia } from "@/lib/tmdb";

const BASE_URL = "https://api.themoviedb.org/3";
const CACHE_TTL = 60 * 60 * 6; // 6 hours

// TMDB genre ID maps (movie and tv have different IDs for some genres)
export const TMDB_GENRE_IDS = {
  movie: {
    Action: 28, Adventure: 12, Animation: 16, Comedy: 35, Crime: 80,
    Documentary: 99, Drama: 18, Family: 10751, Fantasy: 14, History: 36,
    Horror: 27, Music: 10402, Mystery: 9648, Romance: 10749,
    "Science Fiction": 878, "Sci-Fi": 878, Thriller: 53, War: 10752, Western: 37,
  } as Record<string, number>,
  tv: {
    Action: 10759, Adventure: 10759, Animation: 16, Comedy: 35, Crime: 80,
    Documentary: 99, Drama: 18, Family: 10751, Fantasy: 10765, History: 36,
    Horror: 27, Kids: 10762, Mystery: 9648, News: 10763, Reality: 10764,
    "Science Fiction": 10765, "Sci-Fi": 10765, Soap: 10766, Talk: 10767,
    War: 10768, Western: 37,
  } as Record<string, number>,
};

// Reverse maps: ID → name (for genre resolution)
export const TMDB_GENRE_NAMES_MOVIE: Record<number, string> = Object.fromEntries(
  Object.entries(TMDB_GENRE_IDS.movie).map(([name, id]) => [id, name])
);
export const TMDB_GENRE_NAMES_TV: Record<number, string> = Object.fromEntries(
  Object.entries(TMDB_GENRE_IDS.tv).map(([name, id]) => [id, name])
);

interface TmdbPageResult {
  results: TmdbMedia[];
  total_pages: number;
  total_results: number;
}

async function tmdbFetch<T>(
  path: string,
  params: Record<string, string> = {},
): Promise<T | null> {
  const key = process.env.TMDB_API_KEY;
  if (!key) return null;
  const query = new URLSearchParams({ api_key: key, ...params });
  try {
    const res = await fetch(`${BASE_URL}${path}?${query}`, {
      next: { revalidate: CACHE_TTL },
    });
    if (!res.ok) return null;
    return res.json() as Promise<T>;
  } catch {
    return null;
  }
}

type NormalizedItem = {
  id: string;
  tmdbId: number;
  type: "MOVIE" | "TV";
  title: string;
  originalTitle: string | null;
  overview: string | null;
  year: number | null;
  language: string;
  posterPath: string | null;
  backdropPath: string | null;
  trailerUrl: null;
  runtimeMinutes: null;
  numberOfSeasons: null;
  completedSeries: false;
  imdbId: null;
  imdbRating: null;
  rottenTomatoesScore: null;
  tmdbRating: number;
  popularity: number;
  genres: string[];
  keywords: string[];
  feedback: never[];
  createdAt: Date;
  updatedAt: Date;
};

function normalizeItem(
  item: TmdbMedia,
  type: "MOVIE" | "TV",
  genreNames: string[],
): NormalizedItem {
  const n = normalizeTmdb(
    { ...item, media_type: type === "MOVIE" ? "movie" : "tv" },
    genreNames,
  );
  return {
    id: `tmdb-${n.tmdbId}`,
    tmdbId: n.tmdbId,
    type: n.type,
    title: n.title,
    originalTitle: n.originalTitle || null,
    overview: n.overview || null,
    year: n.year || null,
    language: n.language,
    posterPath: n.posterPath,
    backdropPath: n.backdropPath,
    trailerUrl: null,
    runtimeMinutes: null,
    numberOfSeasons: null,
    completedSeries: false,
    imdbId: null,
    imdbRating: null,
    rottenTomatoesScore: null,
    tmdbRating: n.tmdbRating,
    popularity: n.popularity,
    genres: genreNames,
    keywords: [],
    feedback: [],
    createdAt: new Date(0),
    updatedAt: new Date(0),
  };
}

/** Fetch multiple pages of a TMDB discover endpoint in parallel */
async function fetchPages(
  path: string,
  baseParams: Record<string, string>,
  type: "MOVIE" | "TV",
  genreIdMap: Record<string, number>,
  maxPages = 5,
): Promise<NormalizedItem[]> {
  const first = await tmdbFetch<TmdbPageResult>(path, {
    ...baseParams,
    page: "1",
  });
  if (!first || !first.results?.length) return [];

  const totalPages = Math.min(first.total_pages, maxPages);
  const restPages =
    totalPages > 1
      ? await Promise.all(
          Array.from({ length: totalPages - 1 }, (_, i) =>
            tmdbFetch<TmdbPageResult>(path, {
              ...baseParams,
              page: String(i + 2),
            }),
          ),
        )
      : [];

  const allItems = [first, ...restPages.filter(Boolean)].flatMap(
    (p) => p!.results,
  );

  // Reverse-lookup genre names from IDs
  const reverseMap: Record<number, string> = Object.fromEntries(
    Object.entries(genreIdMap).map(([name, id]) => [id, name]),
  );

  return allItems.map((item) => {
    const names = (item.genre_ids || [])
      .map((id) => reverseMap[id])
      .filter(Boolean) as string[];
    return normalizeItem(item, type, names);
  });
}

// ─── Public fetch functions ───────────────────────────────────────────────────

/** Top-rated Hollywood movies (English, all time) */
export async function fetchHollywoodMovies(maxPages = 5) {
  return fetchPages(
    "/discover/movie",
    {
      sort_by: "vote_average.desc",
      "vote_count.gte": "500",
      with_original_language: "en",
      without_genres: "10749",
      include_adult: "false",
    },
    "MOVIE",
    TMDB_GENRE_IDS.movie,
    maxPages,
  );
}

/** Top-rated British TV shows (origin_country=GB, English) */
export async function fetchBritishShows(maxPages = 3) {
  return fetchPages(
    "/discover/tv",
    {
      sort_by: "vote_average.desc",
      "vote_count.gte": "200",
      with_original_language: "en",
      with_origin_country: "GB",
      include_adult: "false",
    },
    "TV",
    TMDB_GENRE_IDS.tv,
    maxPages,
  );
}

/** Top-rated American TV shows */
export async function fetchAmericanShows(maxPages = 5) {
  return fetchPages(
    "/discover/tv",
    {
      sort_by: "vote_average.desc",
      "vote_count.gte": "300",
      with_original_language: "en",
      include_adult: "false",
    },
    "TV",
    TMDB_GENRE_IDS.tv,
    maxPages,
  );
}

/** Top-rated Malayalam movies and TV shows */
export async function fetchMalayalamContent(maxPages = 3) {
  const [movies, tv] = await Promise.all([
    fetchPages(
      "/discover/movie",
      {
        sort_by: "vote_average.desc",
        "vote_count.gte": "30",
        with_original_language: "ml",
        include_adult: "false",
      },
      "MOVIE",
      TMDB_GENRE_IDS.movie,
      maxPages,
    ),
    fetchPages(
      "/discover/tv",
      {
        sort_by: "vote_average.desc",
        "vote_count.gte": "10",
        with_original_language: "ml",
        include_adult: "false",
      },
      "TV",
      TMDB_GENRE_IDS.tv,
      maxPages,
    ),
  ]);
  return [...movies, ...tv];
}

/** Fetch content by specific genre (movies + tv or one type) */
export async function fetchByGenre(
  genre: string,
  type: "MOVIE" | "TV" | "ALL",
  maxPages = 3,
): Promise<NormalizedItem[]> {
  const results: NormalizedItem[] = [];

  if (type !== "TV") {
    const genreId = TMDB_GENRE_IDS.movie[genre];
    if (genreId) {
      const items = await fetchPages(
        "/discover/movie",
        {
          sort_by: "vote_average.desc",
          "vote_count.gte": "200",
          with_genres: String(genreId),
          with_original_language: "en|ml",
          without_genres: "10749",
          include_adult: "false",
        },
        "MOVIE",
        TMDB_GENRE_IDS.movie,
        maxPages,
      );
      results.push(...items);
    }
  }

  if (type !== "MOVIE") {
    const genreId = TMDB_GENRE_IDS.tv[genre];
    if (genreId) {
      const items = await fetchPages(
        "/discover/tv",
        {
          sort_by: "vote_average.desc",
          "vote_count.gte": "100",
          with_genres: String(genreId),
          with_original_language: "en|ml",
          include_adult: "false",
        },
        "TV",
        TMDB_GENRE_IDS.tv,
        maxPages,
      );
      results.push(...items);
    }
  }

  return results;
}

/** Search TMDB with full genre name resolution */
export async function searchTmdbWithGenres(
  query: string,
): Promise<NormalizedItem[]> {
  const data = await tmdbFetch<{ results: TmdbMedia[] }>("/search/multi", {
    query,
    page: "1",
    include_adult: "false",
  });
  if (!data) return [];

  return data.results
    .filter(
      (item) =>
        item.media_type !== "person" &&
        !["hi"].includes(item.original_language),
    )
    .map((item) => {
      const type =
        item.media_type === "movie" || item.title ? "MOVIE" : "TV";
      const genreMap =
        type === "MOVIE" ? TMDB_GENRE_IDS.movie : TMDB_GENRE_IDS.tv;
      const reverseMap: Record<number, string> = Object.fromEntries(
        Object.entries(genreMap).map(([name, id]) => [id, name]),
      );
      const names = (item.genre_ids || [])
        .map((id) => reverseMap[id])
        .filter(Boolean) as string[];
      return normalizeItem(item, type, names);
    });
}

/** Fetch ALL content: Hollywood + British + American TV + Malayalam — deduplicated */
export async function fetchAllContent(): Promise<NormalizedItem[]> {
  const [hollywood, british, american, malayalam] = await Promise.all([
    fetchHollywoodMovies(5),
    fetchBritishShows(3),
    fetchAmericanShows(5),
    fetchMalayalamContent(3),
  ]);

  const seen = new Set<string>();
  return [...hollywood, ...british, ...american, ...malayalam].filter((item) => {
    const key = `${item.tmdbId}-${item.type}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export type { NormalizedItem };
