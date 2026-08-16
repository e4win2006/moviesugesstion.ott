type ImdbSuggestion = {
  id?: string;
  l?: string;
  y?: number;
  q?: string;
};

type ImdbGraphqlResponse = {
  data?: {
    title?: {
      id?: string;
      titleText?: { text?: string };
      releaseYear?: { year?: number };
      titleType?: { id?: string };
      genres?: { genres?: Array<{ text?: string }> };
      ratingsSummary?: { aggregateRating?: number };
      plots?: { edges?: Array<{ node?: { plotText?: { plainText?: string } } }> };
    };
  };
};

function normalized(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function isWantedType(label: string | undefined, type: "MOVIE" | "TV") {
  const value = (label || "").toLowerCase();
  return type === "TV"
    ? value.includes("series") || value.includes("tv")
    : !value.includes("series") && !value.includes("episode");
}

async function imdbFetch(url: string) {
  const response = await fetch(url, {
    headers: {
      "accept-language": "en-US,en;q=0.9",
      "user-agent": "Mozilla/5.0 (compatible; FamilyWatchAdvisor/1.0)",
    },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`IMDb request failed: ${response.status}`);
  return response;
}

export async function findImdbTitle(title: string, year: number | undefined, type: "MOVIE" | "TV") {
  const query = encodeURIComponent(title.trim().toLowerCase());
  const suggestionResponse = await imdbFetch(`https://v3.sg.media-imdb.com/suggestion/x/${query}.json`);
  const suggestions = (await suggestionResponse.json()) as { d?: ImdbSuggestion[] };
  const wantedTitle = normalized(title);
  const match = (suggestions.d || [])
    .filter((item) => item.id?.startsWith("tt") && isWantedType(item.q, type))
    .map((item) => ({
      item,
      score:
        (normalized(item.l || "") === wantedTitle ? 1000 : normalized(item.l || "").includes(wantedTitle) ? 500 : 0)
        - (year && item.y ? Math.abs(year - item.y) * 50 : 0),
    }))
    .sort((a, b) => b.score - a.score)[0]?.item;

  if (!match?.id) return null;

  const graphResponse = await fetch("https://api.graphql.imdb.com/", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "user-agent": "Mozilla/5.0 (compatible; FamilyWatchAdvisor/1.0)",
    },
    body: JSON.stringify({
      query: `query {
        title(id: "${match.id}") {
          id
          titleText { text }
          releaseYear { year }
          titleType { id }
          genres { genres { text } }
          ratingsSummary { aggregateRating }
          plots(first: 1) { edges { node { plotText { plainText } } } }
        }
      }`,
    }),
    cache: "no-store",
  });
  if (!graphResponse.ok) throw new Error(`IMDb metadata request failed: ${graphResponse.status}`);
  const graph = (await graphResponse.json()) as ImdbGraphqlResponse;
  const structured = graph.data?.title;
  if (!structured) return null;

  return {
    imdbId: match.id,
    title: structured.titleText?.text || match.l || title,
    year: structured.releaseYear?.year || match.y || year,
    type,
    genres: structured.genres?.genres
      ?.map((genre) => genre.text?.trim())
      .filter((genre): genre is string => Boolean(genre)) || [],
    overview: structured.plots?.edges?.[0]?.node?.plotText?.plainText || null,
    imdbRating: structured.ratingsSummary?.aggregateRating || null,
  };
}
