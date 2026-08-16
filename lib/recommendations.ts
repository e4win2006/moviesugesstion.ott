import type { FeedbackType, Title } from "@prisma/client";
import { CATEGORY_RULES, PREFERRED_GENRES } from "@/lib/constants";

type TitleWithSignals = Title & {
  feedback?: Array<{ type: FeedbackType }>;
};

export type ScoredTitle = TitleWithSignals & {
  score: number;
  reason: string;
  scoreParts: {
    genreMatch: number;
    similarUsers: number;
    imdb: number;
    rottenTomatoes: number;
  };
};

const signalMap: Record<string, string[]> = {
  "Person of Interest": ["Artificial Intelligence", "Crime Thriller", "Government Conspiracy", "Surveillance"],
  "Mr. Robot": ["Hacking", "Cybersecurity", "Tech Drama", "Psychological Thriller"],
  "Designated Survivor": ["Government Conspiracy", "Political Thriller"],
  "Scorpion": ["Tech Drama", "Action"],
  "CSI: Cyber": ["Cybersecurity", "Crime Thriller", "Detective"],
  "The Boys": ["Action", "Psychological Thriller"],
  "Gen V": ["Action", "Mystery"],
};

function overlapScore(haystack: string[], needles: readonly string[]) {
  if (!needles.length) return 0;
  const normalized = new Set(haystack.map((value) => value.toLowerCase()));
  return needles.filter((value) => normalized.has(value.toLowerCase())).length / needles.length;
}

export function scoreTitle(
  title: TitleWithSignals,
  favoriteGenres: string[] = [...PREFERRED_GENRES],
  positiveAnchors = Object.keys(signalMap),
): ScoredTitle {
  const tags = [...(title?.genres || []), ...(title?.keywords || [])];
  const genreMatch = overlapScore(tags, favoriteGenres);
  const anchorTags = positiveAnchors.flatMap((anchor) => signalMap[anchor] || []);
  const anchorAffinity = Math.min(1, overlapScore(tags, [...new Set(anchorTags)]) * 1.5);
  const qualityConsensus = Math.min(1, Math.log10(Math.max(title?.popularity || 1, 1)) / 3);
  const similarUsers = anchorAffinity * 0.8 + qualityConsensus * 0.2;
  const imdb = Math.min(1, (title?.imdbRating ?? title?.tmdbRating ?? 0) / 10);
  const rottenTomatoes = Math.min(1, (title?.rottenTomatoesScore ?? ((title?.tmdbRating ?? 0) * 10)) / 100);
  const completionBoost = title?.type === "TV" && title?.completedSeries ? 0.03 : 0;
  const score = Math.min(
    100,
    Math.round((genreMatch * 0.4 + similarUsers * 0.25 + imdb * 0.2 + rottenTomatoes * 0.15 + completionBoost) * 100),
  );

  const matches = favoriteGenres.filter((genre) =>
    tags.some((tag) => tag.toLowerCase() === genre.toLowerCase()),
  );
  const anchor = positiveAnchors.find((name) =>
    (signalMap[name] || []).some((tag) => tags.includes(tag)),
  );
  const reason = anchor
    ? `Recommended because you loved ${anchor} and enjoy ${matches.slice(0, 3).join(", ") || "smart, high-stakes stories"}.`
    : `A strong match for your interest in ${matches.slice(0, 3).join(", ") || "highly rated thrillers"}.`;

  return {
    ...title,
    score,
    reason,
    scoreParts: { genreMatch, similarUsers, imdb, rottenTomatoes },
  };
}

export function buildCategories(titles: ScoredTitle[]) {
  return CATEGORY_RULES.map((category) => {
    const matching = (titles || [])
      .filter((title) => {
        const tags = [...(title?.genres || []), ...(title?.keywords || [])];
        const tagged = category.tags.some((tag) => tags.includes(tag));
        if (category.id === "hidden-gems") {
          return tagged && (title?.popularity || 0) < 100 && (title?.imdbRating ?? title?.tmdbRating ?? 0) >= 7;
        }
        return tagged;
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
    return { ...category, titles: matching };
  }).filter((category) => category.titles.length > 0);
}

export function isStrictlyExcluded(
  title: Pick<Title, "language" | "title" | "originalTitle">,
  excludedLanguages: string[] = ["hi"],
) {
  const text = `${title?.title || ""} ${title?.originalTitle || ""}`.toLowerCase();
  return (title?.language && excludedLanguages.includes(title.language.toLowerCase())) || text.includes("bollywood");
}

