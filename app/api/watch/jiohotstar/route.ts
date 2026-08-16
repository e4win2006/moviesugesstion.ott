import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const title = searchParams.get("title")?.trim();
    const type = searchParams.get("type") === "movie" ? "movie" : "tv series";

    if (!title) {
      return NextResponse.redirect("https://www.hotstar.com/in/home");
    }

    const query = encodeURIComponent(`${title} India ${type} Jio Hotstar`);
    const targetUrl = `https://www.google.com/search?q=${query}&gl=in&hl=en`;
    return NextResponse.redirect(targetUrl);
  } catch (err: any) {
    console.error("JioHotstar redirect error:", err);
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
