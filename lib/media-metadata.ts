import type { MediaMetadata } from "@/lib/media-types";

// In-memory metadata cache across scans
const metaCache = new Map<string, MediaMetadata>();

/**
 * Clean up messy release filenames into human-readable movie titles & years
 * e.g. "Inception.2010.1080p.BluRay.x264.mp4" -> { cleanTitle: "Inception", year: 2010 }
 * e.g. "The.Batman.2022.2160p.WEB-DL.DDP5.1.Atmos.H.265-FLUX.mkv" -> { cleanTitle: "The Batman", year: 2022 }
 * e.g. "Manjummel.Boys.2024.Malayalam.1080p.mp4" -> { cleanTitle: "Manjummel Boys", year: 2024 }
 */
export function parseMediaFilename(filename: string): { cleanTitle: string; year: number | null } {
  // Remove file extension
  let name = filename.replace(/\.[^/.]+$/, "");

  // Replace dots, underscores, pluses with spaces
  name = name.replace(/[._+]/g, " ");

  // Extract 4-digit year if present (between 1920 and 2030)
  let year: number | null = null;
  const yearMatch = name.match(/[\s(]((?:19|20)\d{2})[\s)]/);
  if (yearMatch) {
    year = parseInt(yearMatch[1], 10);
    // Remove year and everything after it for title extraction
    const idx = name.indexOf(yearMatch[0]);
    if (idx > 0) {
      name = name.substring(0, idx);
    }
  }

  // Remove common release group & quality noise tags
  const noiseRegex = /\b(1080p|720p|2160p|4k|uhd|hdr|hdr10|bluray|blu-ray|web-dl|webrip|brrip|dvdrip|x264|x265|hevc|h264|h265|aac|dts|ac3|ddp5\.1|dd5\.1|atmos|remux|extended|unrated|directors\.cut|dual\.audio|malayalam|hindi|tamil|telugu|english|proper|repack|yify|rarbg|yts|psa|galaxy|evo|flux|cmrg)\b/gi;
  name = name.replace(noiseRegex, "");

  // Remove brackets, parentheses, extra dashes
  name = name.replace(/[\[\](){}\-_]/g, " ");

  // Normalize whitespace
  const cleanTitle = name.replace(/\s+/g, " ").trim();

  return {
    cleanTitle: cleanTitle || filename.replace(/\.[^/.]+$/, ""),
    year,
  };
}

/**
 * Fetch rich movie metadata (posters, synopsis, genres, IMDb rating) from TMDB or fallback
 */
/**
 * Fetch official IMDb movie/TV metadata via public IMDb suggestion API
 */
export async function fetchImdbMetadata(
  cleanTitle: string,
  year?: number | null
): Promise<Partial<MediaMetadata> | null> {
  try {
    const encoded = encodeURIComponent(cleanTitle.toLowerCase().replace(/[^a-z0-9 ]/g, " ").trim());
    if (!encoded) return null;

    const res = await fetch(`https://v3.sg.media-imdb.com/suggestion/x/${encoded}.json`, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
      next: { revalidate: 60 * 60 * 24 },
    });

    if (!res.ok) return null;
    const data = await res.json();
    const items: Array<{
      id?: string;
      l?: string;
      y?: number;
      q?: string;
      s?: string;
      i?: { imageUrl?: string };
    }> = data.d || [];

    // Filter to feature films or TV series
    const videoItems = items.filter((item) => item.id?.startsWith("tt"));
    if (!videoItems.length) return null;

    // Best match: match year if given, else pick first valid
    const match =
      (year ? videoItems.find((item) => item.y === year) : null) ||
      videoItems.find((item) => item.q === "feature" || item.q === "TV series") ||
      videoItems[0];

    if (!match || !match.id) return null;

    return {
      cleanTitle: match.l || cleanTitle,
      year: match.y || year || null,
      imdbId: match.id,
      imdbUrl: `https://www.imdb.com/title/${match.id}/`,
      actors: match.s || null,
      posterUrl: match.i?.imageUrl || null,
    };
  } catch (err) {
    console.warn("IMDb metadata fetch error for:", cleanTitle, err);
    return null;
  }
}

/**
 * Fetch rich song/music metadata (artist, album, year, artwork) from iTunes music catalog
 */
export async function fetchSongMetadata(
  cleanTitle: string
): Promise<Partial<MediaMetadata> | null> {
  try {
    const res = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(cleanTitle)}&media=music&limit=1`,
      { next: { revalidate: 60 * 60 * 24 } }
    );

    if (!res.ok) return null;
    const data = await res.json();
    const track = data.results?.[0];
    if (!track) return null;

    const highResArtwork = track.artworkUrl100
      ? track.artworkUrl100.replace("100x100bb", "600x600bb")
      : null;

    const trackYear = track.releaseDate ? parseInt(track.releaseDate.slice(0, 4), 10) : null;

    return {
      cleanTitle: track.trackName || cleanTitle,
      artist: track.artistName || null,
      album: track.collectionName || null,
      year: trackYear,
      genres: track.primaryGenreName ? [track.primaryGenreName] : [],
      posterUrl: highResArtwork,
    };
  } catch (err) {
    console.warn("Song metadata fetch error for:", cleanTitle, err);
    return null;
  }
}

/**
 * Fetch rich movie or song metadata from IMDb, TMDB, or iTunes
 */
export async function fetchMediaMetadata(
  filename: string,
  mediaType: "video" | "audio" = "video"
): Promise<MediaMetadata> {
  const { cleanTitle, year } = parseMediaFilename(filename);
  const cacheKey = `${cleanTitle.toLowerCase()}_${year || ""}_${mediaType}`;

  if (metaCache.has(cacheKey)) {
    return metaCache.get(cacheKey)!;
  }

  // Base metadata from filename
  const result: MediaMetadata = {
    cleanTitle,
    year,
    overview: null,
    posterUrl: null,
    backdropUrl: null,
    rating: null,
    genres: [],
    imdbId: null,
    imdbUrl: null,
    artist: null,
    album: null,
    actors: null,
  };

  // 1. Audio / Song Metadata (via iTunes & Music catalog)
  if (mediaType === "audio") {
    const songMeta = await fetchSongMetadata(cleanTitle);
    if (songMeta) {
      Object.assign(result, songMeta);
    }
    metaCache.set(cacheKey, result);
    return result;
  }

  // 2. Video / Movie Metadata (via TMDB if key configured)
  const tmdbKey = process.env.TMDB_API_KEY;
  if (tmdbKey) {
    try {
      const params = new URLSearchParams({
        api_key: tmdbKey,
        query: cleanTitle,
        include_adult: "false",
      });
      if (year) {
        params.set("year", String(year));
      }

      const res = await fetch(`https://api.themoviedb.org/3/search/multi?${params.toString()}`, {
        next: { revalidate: 60 * 60 * 24 },
      });

      if (res.ok) {
        const data = await res.json();
        const match = data.results?.find(
          (r: { media_type?: string; poster_path?: string }) =>
            (r.media_type === "movie" || r.media_type === "tv") && r.poster_path
        ) || data.results?.[0];

        if (match) {
          result.cleanTitle = match.title || match.name || cleanTitle;
          result.overview = match.overview || null;
          result.posterUrl = match.poster_path
            ? `https://image.tmdb.org/t/p/w500${match.poster_path}`
            : null;
          result.backdropUrl = match.backdrop_path
            ? `https://image.tmdb.org/t/p/original${match.backdrop_path}`
            : null;
          result.rating = match.vote_average ? Number(match.vote_average.toFixed(1)) : null;
          result.year =
            year ||
            (match.release_date
              ? parseInt(match.release_date.slice(0, 4), 10)
              : match.first_air_date
                ? parseInt(match.first_air_date.slice(0, 4), 10)
                : null);
        }
      }
    } catch (err) {
      console.warn("Failed to fetch TMDB metadata for:", cleanTitle, err);
    }
  }

  // 3. Fallback or augment with official IMDb Search (provides direct IMDb ID, actors, and official poster)
  if (!result.imdbId || !result.posterUrl) {
    const imdbMeta = await fetchImdbMetadata(cleanTitle, year);
    if (imdbMeta) {
      if (!result.posterUrl && imdbMeta.posterUrl) result.posterUrl = imdbMeta.posterUrl;
      if (!result.imdbId && imdbMeta.imdbId) result.imdbId = imdbMeta.imdbId;
      if (!result.imdbUrl && imdbMeta.imdbUrl) result.imdbUrl = imdbMeta.imdbUrl;
      if (!result.actors && imdbMeta.actors) result.actors = imdbMeta.actors;
      if (!result.year && imdbMeta.year) result.year = imdbMeta.year;
    }
  }

  // Ensure direct IMDb search link exists if imdbId is present
  if (result.imdbId && !result.imdbUrl) {
    result.imdbUrl = `https://www.imdb.com/title/${result.imdbId}/`;
  } else if (!result.imdbUrl) {
    result.imdbUrl = `https://www.imdb.com/find/?q=${encodeURIComponent(cleanTitle + (result.year ? ` ${result.year}` : ""))}&s=tt`;
  }

  metaCache.set(cacheKey, result);
  return result;
}
