import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionProfileId } from "@/lib/auth";
import { scoreTitle, isStrictlyExcluded } from "@/lib/recommendations";
import { PREFERRED_GENRES } from "@/lib/constants";
import { searchTmdbWithGenres } from "@/lib/content-agent";
import type { Title, Feedback } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();
  if (!query) return NextResponse.json({ results: [], hasTmdb: !!process.env.TMDB_API_KEY });

  const profileId = await getSessionProfileId();
  const profile = profileId
    ? await prisma.profile.findUnique({
        where: { id: profileId },
        include: {
          watchEntries: { include: { title: true } },
          feedback: { include: { title: true } },
          exclusions: true,
        },
      })
    : null;

  const excludedLanguages = profile?.excludedLanguages || ["hi"];
  const favoriteFeedback =
    profile?.feedback.filter((e) => e.type === "FAVORITE") || [];
  const tasteGenres = profile
    ? [
        ...new Set([
          ...profile.favoriteGenres,
          ...favoriteFeedback.flatMap((e) => [
            ...e.title.genres,
            ...e.title.keywords,
          ]),
        ]),
      ]
    : [...PREFERRED_GENRES];
  const positiveAnchors = profile
    ? profile.feedback
        .filter((e) => e.type === "LIKE" || e.type === "FAVORITE")
        .map((e) => e.title.title)
    : [];

  // 1. Local DB search
  const local = await prisma.title
    .findMany({
      where: {
        title: { contains: query, mode: "insensitive" },
        language: { notIn: excludedLanguages },
      },
      include: profile
        ? { feedback: { where: { profileId: profile.id } } }
        : undefined,
      take: 20,
    })
    .catch(() => []);

  // 2. Live TMDB search (with real genre names resolved via content-agent)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let combined: (Title & { feedback?: Feedback[] } | any)[] = [...local];

  if (process.env.TMDB_API_KEY) {
    try {
      const remote = await searchTmdbWithGenres(query);
      const seen = new Set(
        local.map((item) => `${item.tmdbId}-${item.type}`),
      );
      const deduped = remote.filter(
        (item) => !seen.has(`${item.tmdbId}-${item.type}`),
      );
      combined = [...local, ...deduped];
    } catch (e) {
      console.warn("TMDB search failed", e);
    }
  }

  // 3. Filter excluded languages
  const filtered = combined.filter(
    (t) => !isStrictlyExcluded(t, excludedLanguages),
  );

  // 4. Score and rank
  const scored = filtered
    .map((t) => scoreTitle(t, tasteGenres, positiveAnchors))
    .sort((a, b) => b.score - a.score);

  return NextResponse.json({
    results: scored,
    hasTmdb: !!process.env.TMDB_API_KEY,
    source: process.env.TMDB_API_KEY ? "local+tmdb-live" : "local-only",
    query,
  });
}
