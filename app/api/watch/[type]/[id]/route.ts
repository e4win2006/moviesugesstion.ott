import { NextResponse } from "next/server";
import { watchProviders } from "@/lib/tmdb";
import { getSessionProfileId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const DEFAULT_REGION = "IN";
const JIOHOTSTAR_URL = "https://www.hotstar.com/in/home";

function allProviders(region?: Awaited<ReturnType<typeof watchProviders>>["results"][string]) {
  if (!region) return [];
  return [
    ...(region.flatrate || []),
    ...(region.free || []),
    ...(region.ads || []),
    ...(region.rent || []),
    ...(region.buy || []),
  ];
}

export async function GET(
  request: Request,
  context: { params: Promise<{ type: string; id: string }> },
) {
  const { type, id } = await context.params;
  const mediaType = type === "movie" ? "movie" : type === "tv" ? "tv" : null;
  const tmdbId = Number(id);

  if (!mediaType || !Number.isInteger(tmdbId) || tmdbId <= 0) {
    return NextResponse.json({ error: "Invalid title" }, { status: 400 });
  }

  const fallback = `https://www.themoviedb.org/${mediaType}/${tmdbId}/watch`;

  if (!process.env.TMDB_API_KEY) {
    return NextResponse.redirect(fallback);
  }

  try {
    const profileId = await getSessionProfileId();
    const profile = profileId
      ? await prisma.profile.findUnique({ where: { id: profileId } })
      : null;

    const data = await watchProviders(mediaType, tmdbId);
    const region = data.results[DEFAULT_REGION] || data.results.US;

    const providersList = profile?.preferredWatchProviders?.length
      ? profile.preferredWatchProviders
      : (process.env.PREFERRED_WATCH_PROVIDERS || "JioHotstar,Hotstar,JioCinema").split(",");

    const preferredNames = providersList
      .map((name) => name.trim().toLowerCase())
      .filter(Boolean);

    const availableOnJioHotstar = allProviders(region).some((provider) =>
      preferredNames.some((name) =>
        provider.provider_name.toLowerCase().includes(name),
      ),
    );

    if (availableOnJioHotstar) {
      return NextResponse.redirect(JIOHOTSTAR_URL);
    }
    return NextResponse.redirect(region?.link || fallback);
  } catch {
    return NextResponse.redirect(fallback);
  }
}

