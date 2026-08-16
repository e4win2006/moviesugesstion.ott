import { yearOf } from "@/lib/utils";

const BASE_URL = "https://api.themoviedb.org/3";

export type TmdbMedia = {
  id: number;
  media_type?: "movie" | "tv" | "person";
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  overview: string;
  original_language: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
  popularity: number;
  genre_ids: number[];
};

async function tmdbFetch<T>(path: string, params: Record<string, string> = {}) {
  if (!process.env.TMDB_API_KEY) throw new Error("TMDB_API_KEY is not configured");
  const query = new URLSearchParams({ api_key: process.env.TMDB_API_KEY, ...params });
  const response = await fetch(`${BASE_URL}${path}?${query}`, {
    next: { revalidate: 60 * 60 * 6 },
  });
  if (!response.ok) throw new Error(`TMDB request failed: ${response.status}`);
  return response.json() as Promise<T>;
}

export type WatchProvider = {
  provider_id: number;
  provider_name: string;
  logo_path: string | null;
  display_priority: number;
};

export type WatchProviderRegion = {
  link: string;
  flatrate?: WatchProvider[];
  rent?: WatchProvider[];
  buy?: WatchProvider[];
  free?: WatchProvider[];
  ads?: WatchProvider[];
};

export async function watchProviders(
  type: "movie" | "tv",
  id: number,
) {
  return tmdbFetch<{ results: Record<string, WatchProviderRegion> }>(
    `/${type}/${id}/watch/providers`,
  );
}

export async function searchTmdb(query: string, page = 1) {
  return tmdbFetch<{ results: TmdbMedia[] }>("/search/multi", {
    query,
    page: String(page),
    include_adult: "false",
  });
}

export async function discoverTmdb(type: "movie" | "tv", page = 1) {
  return tmdbFetch<{ results: TmdbMedia[] }>(`/discover/${type}`, {
    page: String(page),
    sort_by: "vote_average.desc",
    "vote_count.gte": "300",
    with_original_language: "en|ml",
    without_genres: "10749",
    include_adult: "false",
  });
}

export async function discoverRecentOtt(
  type: "movie" | "tv",
  fromDate: string,
  toDate: string,
  preferredLanguages: string[] = ["en", "ml"],
  page = 1,
) {
  const dateField = type === "movie" ? "primary_release_date" : "first_air_date";
  return tmdbFetch<{ results: TmdbMedia[] }>(`/discover/${type}`, {
    page: String(page),
    sort_by: `${dateField}.desc`,
    [`${dateField}.gte`]: fromDate,
    [`${dateField}.lte`]: toDate,
    watch_region: "IN",
    with_watch_monetization_types: "flatrate|free|ads",
    with_original_language: preferredLanguages.join("|"),
    without_genres: "10749",
    include_adult: "false",
  });
}

export async function tmdbGenres(type: "movie" | "tv") {
  return tmdbFetch<{ genres: Array<{ id: number; name: string }> }>(`/genre/${type}/list`);
}

export async function titleDetails(type: "movie" | "tv", id: number) {
  return tmdbFetch<Record<string, unknown>>(`/${type}/${id}`, {
    append_to_response: "external_ids,videos,keywords",
  });
}

export function normalizeTmdb(item: TmdbMedia, genreNames: string[] = []) {
  const type = item.media_type === "movie" || item.title ? "MOVIE" : "TV";
  return {
    tmdbId: item.id,
    type: type as "MOVIE" | "TV",
    title: item.title || item.name || "Untitled",
    originalTitle: item.original_title || item.original_name,
    overview: item.overview,
    year: yearOf(item.release_date || item.first_air_date),
    language: item.original_language,
    posterPath: item.poster_path,
    backdropPath: item.backdrop_path,
    tmdbRating: item.vote_average,
    popularity: item.popularity,
    genres: genreNames,
    keywords: [],
  };
}
