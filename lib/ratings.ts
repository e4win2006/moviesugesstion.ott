type OmdbResult = {
  Response?: string;
  Title?: string;
  Year?: string;
  Type?: string;
  Genre?: string;
  Plot?: string;
  Poster?: string;
  imdbID?: string;
  imdbRating?: string;
  Ratings?: Array<{ Source: string; Value: string }>;
};

async function fetchOmdb(params: Record<string, string>) {
  if (!process.env.OMDB_API_KEY) return null;
  const query = new URLSearchParams({ apikey: process.env.OMDB_API_KEY, ...params });
  const response = await fetch(`https://www.omdbapi.com/?${query}`, {
    next: { revalidate: 60 * 60 * 24 * 7 },
  });
  if (!response.ok) return null;
  const data = (await response.json()) as OmdbResult;
  return data.Response === "False" ? null : data;
}

function normalizeRatings(data: OmdbResult, fallbackImdbId?: string) {
  const rt = data.Ratings?.find((rating) => rating.Source === "Rotten Tomatoes");
  return {
    imdbId: data.imdbID || fallbackImdbId || null,
    imdbRating: data.imdbRating && data.imdbRating !== "N/A" ? Number(data.imdbRating) : null,
    rottenTomatoesScore: rt ? Number.parseInt(rt.Value, 10) : null,
  };
}

export async function fetchExternalRatings(imdbId: string) {
  const data = await fetchOmdb({ i: imdbId });
  return data ? normalizeRatings(data, imdbId) : null;
}

export async function findOmdbTitle(title: string, year?: number, type?: "MOVIE" | "TV") {
  const data = await fetchOmdb({
    t: title,
    ...(year ? { y: String(year) } : {}),
    ...(type ? { type: type === "MOVIE" ? "movie" : "series" } : {}),
    plot: "short",
  });
  if (!data) return null;
  const ratings = normalizeRatings(data);
  return {
    ...ratings,
    title: data.Title || title,
    year: data.Year ? Number.parseInt(data.Year, 10) || year : year,
    type: data.Type === "series" ? "TV" as const : "MOVIE" as const,
    genres: data.Genre && data.Genre !== "N/A"
      ? data.Genre.split(",").map((genre) => genre.trim()).filter(Boolean)
      : [],
    overview: data.Plot && data.Plot !== "N/A" ? data.Plot : null,
    posterUrl: data.Poster && data.Poster !== "N/A" ? data.Poster : null,
  };
}
