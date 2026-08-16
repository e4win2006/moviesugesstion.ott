import { prisma } from "@/lib/prisma";
import { buildCategories, isStrictlyExcluded, scoreTitle, type ScoredTitle } from "@/lib/recommendations";
import { PREFERRED_GENRES } from "@/lib/constants";
import { getSessionProfileId } from "@/lib/auth";

export const fallbackTitles = [
  // Latest Movies
  { id: "demo-dune-2", tmdbId: 693134, imdbId: "tt15239678", type: "MOVIE" as const, title: "Dune: Part Two", year: 2024, language: "en", genres: ["Sci-Fi", "Action", "Adventure"], keywords: ["Space Exploration", "Dystopian Future"], imdbRating: 8.5, rottenTomatoesScore: 92, tmdbRating: 8.5, popularity: 350, posterPath: "/1pdfLPoWuVzhAcStmC2jKMToNJg.jpg", completedSeries: false },
  { id: "demo-oppenheimer", tmdbId: 872585, imdbId: "tt15398776", type: "MOVIE" as const, title: "Oppenheimer", year: 2023, language: "en", genres: ["Drama", "History", "Political Thriller"], keywords: ["Government Conspiracy"], imdbRating: 8.9, rottenTomatoesScore: 93, tmdbRating: 8.9, popularity: 310, posterPath: "/8Gxv8gSFCU0XGDykEGvCiqA1Wl.jpg", completedSeries: false },
  { id: "demo-alien-romulus", tmdbId: 945961, imdbId: "tt18412256", type: "MOVIE" as const, title: "Alien: Romulus", year: 2024, language: "en", genres: ["Sci-Fi", "Horror", "Action"], keywords: ["Space Exploration", "Survival"], imdbRating: 7.3, rottenTomatoesScore: 80, tmdbRating: 7.3, popularity: 290, posterPath: "/b33nnKl1bdhCOAAY2hYSuioAYR5.jpg", completedSeries: false },
  { id: "demo-civil-war", tmdbId: 929590, imdbId: "tt17279496", type: "MOVIE" as const, title: "Civil War", year: 2024, language: "en", genres: ["Action", "Political Thriller", "Dystopian Future"], keywords: ["Government Conspiracy"], imdbRating: 7.1, rottenTomatoesScore: 81, tmdbRating: 7.1, popularity: 240, posterPath: "/sh7Rg8Er3tFcN9VJzNvjG2A25hP.jpg", completedSeries: false },
  { id: "demo-deadpool-wolverine", tmdbId: 533535, imdbId: "tt6263850", type: "MOVIE" as const, title: "Deadpool & Wolverine", year: 2024, language: "en", genres: ["Action", "Comedy", "Marvel"], keywords: ["Sci-Fi"], imdbRating: 7.7, rottenTomatoesScore: 78, tmdbRating: 7.7, popularity: 400, posterPath: "/8cdWjvZKV2bKjE9Z2GZUzZJvVI.jpg", completedSeries: false },
  { id: "demo-inside-out-2", tmdbId: 1022789, imdbId: "tt22022452", type: "MOVIE" as const, title: "Inside Out 2", year: 2024, language: "en", genres: ["Animation", "Comedy", "Drama"], keywords: ["Psychological Thriller"], imdbRating: 7.6, rottenTomatoesScore: 91, tmdbRating: 7.6, popularity: 330, posterPath: "/vpnVM9B6NMmQpEZaE1f4t4uYmP.jpg", completedSeries: false },
  { id: "demo-fall-guy", tmdbId: 746036, imdbId: "tt1684562", type: "MOVIE" as const, title: "The Fall Guy", year: 2024, language: "en", genres: ["Action", "Comedy", "Crime Thriller"], keywords: ["Detective"], imdbRating: 6.9, rottenTomatoesScore: 82, tmdbRating: 6.9, popularity: 210, posterPath: "/e112FlbA6e4Wz89255j6c039yP.jpg", completedSeries: false },
  { id: "demo-gladiator-2", tmdbId: 558449, imdbId: "tt9263550", type: "MOVIE" as const, title: "Gladiator II", year: 2024, language: "en", genres: ["Action", "Drama", "History"], keywords: ["Political Thriller"], imdbRating: 6.8, rottenTomatoesScore: 76, tmdbRating: 6.8, popularity: 280, posterPath: "/2cxhvwyEwRlysAmRHrchAvo05hp.jpg", completedSeries: false },
  { id: "demo-godzilla-kong", tmdbId: 823464, imdbId: "tt14539740", type: "MOVIE" as const, title: "Godzilla x Kong: The New Empire", year: 2024, language: "en", genres: ["Action", "Sci-Fi"], keywords: ["Survival"], imdbRating: 6.1, rottenTomatoesScore: 54, tmdbRating: 6.1, popularity: 220, posterPath: "/z1y5ebWpgr8VUdEENlyMw0WiyXD.jpg", completedSeries: false },
  { id: "demo-trap", tmdbId: 1032823, imdbId: "tt26753003", type: "MOVIE" as const, title: "Trap", year: 2024, language: "en", genres: ["Crime Thriller", "Mystery", "Psychological Thriller"], keywords: ["Detective"], imdbRating: 6.2, rottenTomatoesScore: 57, tmdbRating: 6.2, popularity: 190, posterPath: "/2XW4wP15b1rW13C7B38A2g521F.jpg", completedSeries: false },

  // Latest TV Shows & Web Series
  { id: "demo-shogun", tmdbId: 126308, imdbId: "tt2788316", type: "TV" as const, title: "Shogun", year: 2024, language: "en", genres: ["Drama", "History", "Political Thriller"], keywords: ["Intelligence Agencies"], imdbRating: 8.7, rottenTomatoesScore: 99, tmdbRating: 8.7, popularity: 340, posterPath: "/7O4iVf26YScHaPDLhPj1P22wW6s.jpg", completedSeries: false },
  { id: "demo-fallout", tmdbId: 106379, imdbId: "tt12637874", type: "TV" as const, title: "Fallout", year: 2024, language: "en", genres: ["Sci-Fi", "Action", "Dystopian Future"], keywords: ["Survival"], imdbRating: 8.4, rottenTomatoesScore: 94, tmdbRating: 8.4, popularity: 360, posterPath: "/2T8V03hH8gY1gJ5c39gY2Ww1h8.jpg", completedSeries: false },
  { id: "demo-penguin", tmdbId: 137437, imdbId: "tt15474916", type: "TV" as const, title: "The Penguin", year: 2024, language: "en", genres: ["Crime Thriller", "Drama", "DC"], keywords: ["Government Conspiracy"], imdbRating: 8.8, rottenTomatoesScore: 95, tmdbRating: 8.8, popularity: 380, posterPath: "/7x09d2k4H78A4b3C59P1G1f6J.jpg", completedSeries: false },
  { id: "demo-arcane", tmdbId: 94605, imdbId: "tt11126994", type: "TV" as const, title: "Arcane", year: 2024, language: "en", genres: ["Animation", "Sci-Fi", "Action"], keywords: ["Dystopian Future"], imdbRating: 9.0, rottenTomatoesScore: 100, tmdbRating: 9.0, popularity: 390, posterPath: "/fqld2gZUtUtmRjTzC2oD5z81L.jpg", completedSeries: false },
  { id: "demo-severance", tmdbId: 95396, imdbId: "tt11280740", type: "TV" as const, title: "Severance", year: 2022, language: "en", genres: ["Tech Drama", "Mystery", "Sci-Fi"], keywords: ["Psychological Thriller", "Government Conspiracy"], imdbRating: 8.7, rottenTomatoesScore: 96, tmdbRating: 8.7, popularity: 320, posterPath: "/pPHpeI2X1qEd1CS1SeyrdhZ4qnT.jpg", completedSeries: false },
  { id: "demo-squid-game", tmdbId: 93405, imdbId: "tt10919420", type: "TV" as const, title: "Squid Game", year: 2024, language: "en", genres: ["Survival", "Psychological Thriller", "Action"], keywords: ["Dystopian Future"], imdbRating: 8.0, rottenTomatoesScore: 85, tmdbRating: 8.0, popularity: 300, posterPath: "/dDlEmu3EZ0Pgg93K2SVNLCjCSvE.jpg", completedSeries: false },
  { id: "demo-last-of-us", tmdbId: 100088, imdbId: "tt3581920", type: "TV" as const, title: "The Last of Us", year: 2023, language: "en", genres: ["Survival", "Action", "Dystopian Future"], keywords: ["Sci-Fi"], imdbRating: 8.7, rottenTomatoesScore: 96, tmdbRating: 8.7, popularity: 275, posterPath: "/uKvVjHNqB5VmOrdxqAt2F7J78ED.jpg", completedSeries: false },
  { id: "demo-slow-horses", tmdbId: 95480, imdbId: "tt5875444", type: "TV" as const, title: "Slow Horses", year: 2022, language: "en", genres: ["Intelligence Agencies", "Crime Thriller"], keywords: ["Government Conspiracy", "Mystery"], imdbRating: 8.3, rottenTomatoesScore: 98, tmdbRating: 8.3, popularity: 175, posterPath: "/b5cVZMP5WxpRUUc0BqIP7J6dGqA.jpg", completedSeries: false },
  { id: "demo-dark", tmdbId: 70523, imdbId: "tt5753856", type: "TV" as const, title: "Dark", year: 2017, language: "de", genres: ["Mystery", "Sci-Fi", "Psychological Thriller"], keywords: ["Government Conspiracy"], imdbRating: 8.7, rottenTomatoesScore: 95, tmdbRating: 8.7, popularity: 185, posterPath: "/apbrbWs8M9lyOpJYU5WXrpFbk1Z.jpg", completedSeries: true },
  { id: "demo-mr-robot", tmdbId: 62560, imdbId: "tt4158110", type: "TV" as const, title: "Mr. Robot", year: 2015, language: "en", genres: ["Cybersecurity", "Hacking", "Psychological Thriller"], keywords: ["Tech Drama"], imdbRating: 8.5, rottenTomatoesScore: 94, tmdbRating: 8.5, popularity: 160, posterPath: "/o7lWq1s8gH52s4j4XpZ9L6oGgW.jpg", completedSeries: true },
  { id: "demo-devs", tmdbId: 81349, imdbId: "tt8134186", type: "TV" as const, title: "Devs", year: 2020, language: "en", genres: ["Artificial Intelligence", "Tech Drama", "Sci-Fi"], keywords: ["Psychological Thriller", "Government Conspiracy"], imdbRating: 7.6, rottenTomatoesScore: 82, tmdbRating: 7.6, popularity: 42, posterPath: "/6vD0yB1HAtB5qvVoR6PC8FbRV8.jpg", completedSeries: true },
  { id: "demo-black-mirror", tmdbId: 42009, imdbId: "tt2085059", type: "TV" as const, title: "Black Mirror", year: 2011, language: "en", genres: ["Sci-Fi", "Tech Drama", "Dystopian Future"], keywords: ["Artificial Intelligence", "Psychological Thriller"], imdbRating: 8.7, rottenTomatoesScore: 84, tmdbRating: 8.7, popularity: 210, posterPath: "/7PRddO7z7mcPi21nZTCMGShAyy1.jpg", completedSeries: false },
  { id: "demo-night-agent", tmdbId: 110356, imdbId: "tt13918776", type: "TV" as const, title: "The Night Agent", year: 2023, language: "en", genres: ["Government Conspiracy", "Action", "Political Thriller"], keywords: ["Intelligence Agencies"], imdbRating: 7.5, rottenTomatoesScore: 81, tmdbRating: 7.5, popularity: 290, posterPath: "/4c5yUNcaff4W4aPrkXE6zr7papX.jpg", completedSeries: false },
].map((item) => ({
  ...item,
  imdbId: "imdbId" in item ? item.imdbId : null,
  originalTitle: null,
  overview: null,
  backdropPath: null,
  trailerUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(item.title + " official trailer")}`,
  runtimeMinutes: null,
  numberOfSeasons: null,
  createdAt: new Date(0),
  updatedAt: new Date(0),
  feedback: [],
}));

export async function getAdvisorData() {
  try {
    const profileId = await getSessionProfileId();
    if (!profileId) throw new Error("No active profile");
    const profile = await prisma.profile.findUnique({
      where: { id: profileId },
      include: {
        watchEntries: { include: { title: true } },
        feedback: { include: { title: true } },
        exclusions: true,
      },
    });
    if (!profile) throw new Error("Database has not been seeded");
    const excluded = new Set([
      ...profile.watchEntries.filter((entry) => entry.status === "WATCHED").map((entry) => entry.titleId),
      ...profile.exclusions.map((entry) => entry.titleId),
      ...profile.feedback.filter((entry) => entry.type === "DISLIKE").map((entry) => entry.titleId),
    ]);
    const favoriteFeedback = profile.feedback.filter((entry) => entry.type === "FAVORITE");
    const tasteGenres = [...new Set([
      ...profile.favoriteGenres,
      ...favoriteFeedback.flatMap((entry) => [...entry.title.genres, ...entry.title.keywords]),
    ])];
    const positiveAnchors = profile.feedback
      .filter((entry) => entry.type === "LIKE" || entry.type === "FAVORITE")
      .map((entry) => entry.title.title);
    const titles = await prisma.title.findMany({
      where: { id: { notIn: [...excluded] } },
      include: { feedback: { where: { profileId: profile.id } } },
    });
    const scored = titles
      .filter((title) => !isStrictlyExcluded(title, profile.excludedLanguages))
      .map((title) => scoreTitle(title, tasteGenres, positiveAnchors))
      .sort((a, b) => b.score - a.score);
    const favorites = favoriteFeedback
      .map((entry) => scoreTitle(entry.title, tasteGenres, positiveAnchors))
      .sort((a, b) => b.score - a.score);
    const movieCount = profile.watchEntries.filter((entry) => entry.title.type === "MOVIE" && entry.status === "WATCHED").length;
    const seriesCount = profile.watchEntries.filter((entry) => entry.title.type === "TV" && entry.status === "WATCHED").length;
    const minutes = profile.watchEntries.reduce((sum, entry) => sum + (entry.minutesWatched || 0), 0);
    return {
      profile,
      favorites,
      titles: scored,
      categories: buildCategories(scored),
      stats: { movieCount, seriesCount, hours: Math.round(minutes / 60), accuracy: profile.recommendationAccuracy || 92 },
      databaseReady: true,
    };
  } catch {
    const scored = fallbackTitles.map((title) =>
      scoreTitle(title as unknown as Parameters<typeof scoreTitle>[0], [...PREFERRED_GENRES]),
    ) as ScoredTitle[];
    return {
      profile: {
        id: "preview",
        name: "Viewer",
        favoriteGenres: [...PREFERRED_GENRES],
        preferredLanguages: ["en", "ml"],
        excludedLanguages: ["hi"],
        preferredWatchProviders: ["JioHotstar", "Hotstar", "JioCinema"],
      },
      favorites: [],
      titles: scored.sort((a, b) => b.score - a.score),
      categories: buildCategories(scored),
      stats: { movieCount: 24, seriesCount: 10, hours: 486, accuracy: 92 },
      databaseReady: false,
    };
  }
}
