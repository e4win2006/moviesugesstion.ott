import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();
  const type = searchParams.get("type") || "movies";

  if (!query) {
    return NextResponse.json({ results: [] });
  }

  try {
    if (type === "music") {
      // Search iTunes Music Catalog
      const res = await fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&limit=8`,
        { next: { revalidate: 60 * 60 * 12 } }
      );
      if (!res.ok) return NextResponse.json({ results: [] });
      const data = await res.json();
      const results = (data.results || []).map((t: any) => ({
        id: String(t.trackId),
        title: t.trackName,
        artist: t.artistName,
        album: t.collectionName,
        year: t.releaseDate ? parseInt(t.releaseDate.slice(0, 4), 10) : null,
        genre: t.primaryGenreName,
        posterUrl: t.artworkUrl100 ? t.artworkUrl100.replace("100x100bb", "600x600bb") : null,
        previewUrl: t.previewUrl || null,
        imdbUrl: `https://www.imdb.com/find/?q=${encodeURIComponent(t.trackName + " " + t.artistName)}&s=all`,
      }));
      return NextResponse.json({ results });
    } else {
      // Search Official IMDb Suggestions Catalog
      const encoded = encodeURIComponent(query.toLowerCase().replace(/[^a-z0-9 ]/g, " ").trim());
      const res = await fetch(`https://v3.sg.media-imdb.com/suggestion/x/${encoded}.json`, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
        next: { revalidate: 60 * 60 * 12 },
      });
      if (!res.ok) return NextResponse.json({ results: [] });
      const data = await res.json();
      const items: any[] = data.d || [];
      const results = items
        .filter((item) => item.id?.startsWith("tt"))
        .slice(0, 8)
        .map((m) => ({
          id: m.id,
          title: m.l,
          year: m.y || null,
          actors: m.s || null,
          type: m.q || "feature",
          posterUrl: m.i?.imageUrl || null,
          imdbId: m.id,
          imdbUrl: `https://www.imdb.com/title/${m.id}/`,
        }));
      return NextResponse.json({ results });
    }
  } catch (err) {
    console.error("IMDb search error:", err);
    return NextResponse.json({ results: [], error: "Search failed" }, { status: 200 });
  }
}
