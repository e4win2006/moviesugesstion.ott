import type { MediaType } from "@prisma/client";
import { getSessionProfileId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isStrictlyExcluded, scoreTitle, type ScoredTitle } from "@/lib/recommendations";
import { discoverRecentOtt, normalizeTmdb, tmdbGenres, type TmdbMedia } from "@/lib/tmdb";

export type OttFeed = {
  movies: ScoredTitle[];
  series: ScoredTitle[];
  live: boolean;
  windowDays: number;
  updatedAt: string;
};

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

async function syncRecentTitles(
  type: "movie" | "tv",
  fromDate: string,
  toDate: string,
  preferredLanguages: string[] = ["en", "ml"],
  excludedLanguages: string[] = ["hi"],
) {
  const [catalog, genreData] = await Promise.all([
    discoverRecentOtt(type, fromDate, toDate, preferredLanguages),
    tmdbGenres(type),
  ]);
  const genreMap = new Map(genreData.genres.map((genre) => [genre.id, genre.name]));

  return Promise.all(
    catalog.results
      .filter((item) => item.poster_path && !excludedLanguages.includes(item.original_language))
      .slice(0, 30)
      .map(async (item: TmdbMedia) => {
        const normalized = normalizeTmdb(
          { ...item, media_type: type },
          item.genre_ids.map((id) => genreMap.get(id)).filter((name): name is string => Boolean(name)),
        );
        return prisma.title.upsert({
          where: {
            tmdbId_type: {
              tmdbId: normalized.tmdbId,
              type: normalized.type as MediaType,
            },
          },
          update: normalized,
          create: normalized,
          include: { feedback: true },
        });
      }),
  );
}

export async function getOttFeed(): Promise<OttFeed> {
  const profileId = await getSessionProfileId();
  if (!profileId) throw new Error("No active profile");
  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    include: {
      watchEntries: true,
      feedback: { include: { title: true } },
      exclusions: true,
    },
  });
  if (!profile) throw new Error("Profile not found");

  const favoriteFeedback = profile.feedback.filter((entry) => entry.type === "FAVORITE");
  const tasteGenres = [...new Set([
    ...profile.favoriteGenres,
    ...favoriteFeedback.flatMap((entry) => [...entry.title.genres, ...entry.title.keywords]),
  ])];
  const positiveAnchors = profile.feedback
    .filter((entry) => entry.type === "LIKE" || entry.type === "FAVORITE")
    .map((entry) => entry.title.title);
  const excludedIds = new Set([
    ...profile.watchEntries.filter((entry) => entry.status === "WATCHED").map((entry) => entry.titleId),
    ...profile.exclusions.map((entry) => entry.titleId),
    ...profile.feedback.filter((entry) => entry.type === "DISLIKE").map((entry) => entry.titleId),
  ]);
  const score = (titles: Awaited<ReturnType<typeof syncRecentTitles>>) =>
    titles
      .filter((title) => !excludedIds.has(title.id) && !isStrictlyExcluded(title, profile.excludedLanguages))
      .map((title) => scoreTitle(
        { ...title, feedback: title.feedback.filter((entry) => entry.profileId === profile.id) },
        tasteGenres,
        positiveAnchors,
      ))
      .sort((a, b) => b.score - a.score);

  const windowDays = 120;
  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - windowDays);

  if (process.env.TMDB_API_KEY) {
    try {
      const [movies, series] = await Promise.all([
        syncRecentTitles("movie", isoDate(from), isoDate(now), profile.preferredLanguages, profile.excludedLanguages),
        syncRecentTitles("tv", isoDate(from), isoDate(now), profile.preferredLanguages, profile.excludedLanguages),
      ]);
      return {
        movies: score(movies),
        series: score(series),
        live: true,
        windowDays,
        updatedAt: now.toISOString(),
      };
    } catch (error) {
      console.warn("Live OTT discovery failed", error);
    }
  }

  const recentLocal = await prisma.title.findMany({
    where: {
      year: { gte: now.getFullYear() - 1 },
      language: { notIn: profile.excludedLanguages },
    },
    include: { feedback: true },
    orderBy: [{ year: "desc" }, { popularity: "desc" }],
    take: 60,
  });
  const scored = score(recentLocal);
  return {
    movies: scored.filter((title) => title.type === "MOVIE"),
    series: scored.filter((title) => title.type === "TV"),
    live: false,
    windowDays,
    updatedAt: now.toISOString(),
  };
}
