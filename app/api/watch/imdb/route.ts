import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const imdbId = searchParams.get("imdbId")?.trim();
  const title = searchParams.get("title")?.trim();
  const year = searchParams.get("year")?.trim();

  if (imdbId && /^tt\d+$/.test(imdbId)) {
    return Response.redirect(`https://www.imdb.com/title/${imdbId}/watchoptions/`, 307);
  }

  if (!title) {
    return Response.redirect("https://www.imdb.com/", 307);
  }

  const query = encodeURIComponent(`${title}${year ? ` ${year}` : ""}`);
  return Response.redirect(`https://www.imdb.com/find/?q=${query}&s=tt`, 307);
}
