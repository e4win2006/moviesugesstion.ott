import type { MediaType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { findOmdbTitle, fetchExternalRatings } from "@/lib/ratings";
import { searchTmdb, titleDetails, type TmdbMedia } from "@/lib/tmdb";
import { yearOf } from "@/lib/utils";
import { findImdbTitle } from "@/lib/imdb";

type EnrichmentInput = {
  title: string;
  type: MediaType;
  year?: number;
  language?: string;
  imdbId?: string;
};

type TmdbDetails = {
  id?: number;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  overview?: string;
  original_language?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
  popularity?: number;
  runtime?: number;
  number_of_seasons?: number;
  status?: string;
  genres?: Array<{ name?: string }>;
  external_ids?: { imdb_id?: string | null };
  keywords?: { keywords?: Array<{ name?: string }>; results?: Array<{ name?: string }> };
  videos?: { results?: Array<{ site?: string; type?: string; key?: string }> };
};

function normalized(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function mediaType(item: TmdbMedia): MediaType {
  return item.media_type === "movie" || Boolean(item.title) ? "MOVIE" : "TV";
}

function itemYear(item: TmdbMedia) {
  return yearOf(item.release_date || item.first_air_date);
}

function chooseMatch(results: TmdbMedia[], input: EnrichmentInput) {
  const wanted = normalized(input.title);
  return results
    .filter((item) => item.media_type !== "person" && mediaType(item) === input.type)
    .map((item) => {
      const candidate = normalized(item.title || item.name || "");
      const exactTitle = candidate === wanted;
      const yearDistance = input.year && itemYear(item)
        ? Math.abs(input.year - (itemYear(item) as number))
        : 0;
      const score = (exactTitle ? 1000 : candidate.includes(wanted) || wanted.includes(candidate) ? 500 : 0)
        - yearDistance * 50
        + Math.min(item.popularity || 0, 100);
      return { item, score };
    })
    .sort((a, b) => b.score - a.score)[0]?.item;
}

export async function enrichTitle(input: EnrichmentInput): Promise<Prisma.TitleUncheckedCreateInput> {
  const fallback: Prisma.TitleUncheckedCreateInput = {
    tmdbId: -(Math.floor(Math.random() * 2_000_000_000) + 1),
    type: input.type,
    title: input.title,
    year: input.year,
    language: input.language || "en",
    imdbId: input.imdbId,
    genres: [],
    keywords: [],
  };

  try {
    if (process.env.TMDB_API_KEY) {
      const search = await searchTmdb(input.title);
      const match = chooseMatch(search.results, input);
      if (match) {
        const apiType = mediaType(match) === "MOVIE" ? "movie" : "tv";
        const details = await titleDetails(apiType, match.id) as TmdbDetails;
        const imdbId = details.external_ids?.imdb_id || input.imdbId || null;
        const externalRatings = imdbId ? await fetchExternalRatings(imdbId) : null;
        const trailer = details.videos?.results?.find(
          (video) => video.site === "YouTube" && video.type === "Trailer" && video.key,
        );
        const keywords = details.keywords?.keywords || details.keywords?.results || [];

        return {
          tmdbId: match.id,
          type: mediaType(match),
          title: details.title || details.name || match.title || match.name || input.title,
          originalTitle: details.original_title || details.original_name || match.original_title || match.original_name,
          overview: details.overview || match.overview || null,
          year: yearOf(details.release_date || details.first_air_date) || itemYear(match) || input.year,
          language: details.original_language || match.original_language || input.language || "en",
          posterPath: details.poster_path ?? match.poster_path,
          backdropPath: details.backdrop_path ?? match.backdrop_path,
          trailerUrl: trailer?.key ? `https://www.youtube.com/watch?v=${trailer.key}` : null,
          runtimeMinutes: details.runtime || null,
          numberOfSeasons: details.number_of_seasons || null,
          completedSeries: apiType === "tv" && (details.status === "Ended" || details.status === "Canceled"),
          imdbId,
          imdbRating: externalRatings?.imdbRating ?? null,
          rottenTomatoesScore: externalRatings?.rottenTomatoesScore ?? null,
          tmdbRating: details.vote_average ?? match.vote_average,
          popularity: details.popularity ?? match.popularity,
          genres: details.genres?.map((genre) => genre.name).filter((name): name is string => Boolean(name)) || [],
          keywords: keywords.map((keyword) => keyword.name).filter((name): name is string => Boolean(name)),
        };
      }
    }
  } catch (error) {
    console.warn("TMDB title enrichment failed", error);
  }

  try {
    const imdb = await findImdbTitle(input.title, input.year, input.type);
    if (imdb) {
      return {
        ...fallback,
        title: imdb.title,
        year: imdb.year,
        type: imdb.type,
        imdbId: imdb.imdbId,
        imdbRating: imdb.imdbRating,
        overview: imdb.overview,
        genres: imdb.genres,
      };
    }
  } catch (error) {
    console.warn("IMDb title enrichment failed", error);
  }

  try {
    const omdb = await findOmdbTitle(input.title, input.year, input.type);
    if (omdb) {
      return {
        ...fallback,
        title: omdb.title,
        year: omdb.year,
        type: omdb.type,
        imdbId: omdb.imdbId,
        imdbRating: omdb.imdbRating,
        rottenTomatoesScore: omdb.rottenTomatoesScore,
        overview: omdb.overview,
        genres: omdb.genres,
      };
    }
  } catch (error) {
    console.warn("OMDb title enrichment failed", error);
  }

  return fallback;
}

export async function findOrCreateEnrichedTitle(input: EnrichmentInput) {
  const enriched = await enrichTitle(input);
  const { tmdbId, type, ...metadata } = enriched;

  if (tmdbId > 0) {
    return prisma.title.upsert({
      where: { tmdbId_type: { tmdbId, type } },
      update: metadata,
      create: enriched,
    });
  }

  if (enriched.imdbId) {
    const existing = await prisma.title.findFirst({ where: { imdbId: enriched.imdbId } });
    if (existing) {
      return prisma.title.update({ where: { id: existing.id }, data: metadata });
    }
  }

  return prisma.title.create({ data: enriched });
}

export async function findOrCreateTitleByTmdbId(tmdbId: number, type: MediaType) {
  const existing = await prisma.title.findUnique({
    where: { tmdbId_type: { tmdbId, type } },
  });
  if (existing) return existing;

  const fallback: Prisma.TitleUncheckedCreateInput = {
    tmdbId,
    type,
    title: "Untitled",
    year: undefined,
    language: "en",
    genres: [],
    keywords: [],
  };

  try {
    if (process.env.TMDB_API_KEY) {
      const apiType = type === "MOVIE" ? "movie" : "tv";
      const details = await titleDetails(apiType, tmdbId) as TmdbDetails;
      const imdbId = details.external_ids?.imdb_id || null;
      const externalRatings = imdbId ? await fetchExternalRatings(imdbId) : null;
      const trailer = details.videos?.results?.find(
        (video) => video.site === "YouTube" && video.type === "Trailer" && video.key,
      );
      const keywords = details.keywords?.keywords || details.keywords?.results || [];

      const payload: Prisma.TitleUncheckedCreateInput = {
        tmdbId,
        type,
        title: details.title || details.name || "Untitled",
        originalTitle: details.original_title || details.original_name || null,
        overview: details.overview || null,
        year: yearOf(details.release_date || details.first_air_date) || undefined,
        language: details.original_language || "en",
        posterPath: details.poster_path || null,
        backdropPath: details.backdrop_path || null,
        trailerUrl: trailer?.key ? `https://www.youtube.com/watch?v=${trailer.key}` : null,
        runtimeMinutes: details.runtime || null,
        numberOfSeasons: details.number_of_seasons || null,
        completedSeries: apiType === "tv" && (details.status === "Ended" || details.status === "Canceled"),
        imdbId,
        imdbRating: externalRatings?.imdbRating ?? null,
        rottenTomatoesScore: externalRatings?.rottenTomatoesScore ?? null,
        tmdbRating: details.vote_average ?? null,
        popularity: details.popularity ?? 0,
        genres: details.genres?.map((genre) => genre.name).filter((name): name is string => Boolean(name)) || [],
        keywords: keywords.map((keyword) => keyword.name).filter((name): name is string => Boolean(name)),
      };

      return await prisma.title.create({ data: payload });
    }
  } catch (error) {
    console.warn(`Failed to enrich title by TMDB ID ${tmdbId}`, error);
  }

  return await prisma.title.create({ data: fallback });
}

