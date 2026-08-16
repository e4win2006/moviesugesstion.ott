import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionProfileId } from "@/lib/auth";
import { findOrCreateEnrichedTitle } from "@/lib/title-enrichment";

const titleSchema = z.object({
  title: z.string().min(1).max(200),
  type: z.enum(["MOVIE", "TV"]).default("MOVIE"),
  year: z.coerce.number().int().min(1900).max(2100).optional(),
  language: z.string().max(10).default("en"),
  imdbId: z.string().optional(),
  imdbRating: z.coerce.number().min(0).max(10).optional(),
  rottenTomatoesScore: z.coerce.number().min(0).max(100).optional(),
  genres: z.array(z.string()).default([]),
  watched: z.boolean().default(true),
  dateWatched: z.string().optional(),
  source: z.string().default("manual"),
});

export async function POST(request: Request) {
  const parsed = titleSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const profileId = await getSessionProfileId();
  const profile = profileId ? await prisma.profile.findUnique({ where: { id: profileId } }) : null;
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  const data = parsed.data;
  const title = await findOrCreateEnrichedTitle({
    title: data.title,
    type: data.type,
    year: data.year,
    language: data.language,
    imdbId: data.imdbId,
  });
  if (title.language === "hi") {
    return NextResponse.json({ error: "Hindi content is excluded by profile rules" }, { status: 400 });
  }
  if (data.watched) {
    await prisma.watchEntry.upsert({
      where: { profileId_titleId: { profileId: profile.id, titleId: title.id } },
      update: {
        status: "WATCHED",
        dateWatched: data.dateWatched ? new Date(data.dateWatched) : new Date(),
        source: data.source,
      },
      create: {
        profileId: profile.id,
        titleId: title.id,
        status: "WATCHED",
        dateWatched: data.dateWatched ? new Date(data.dateWatched) : new Date(),
        source: data.source,
      },
    });
  }
  return NextResponse.json({
    title,
    enriched: title.genres.length > 0,
    message: title.genres.length
      ? `Added ${title.title} with genres: ${title.genres.join(", ")}`
      : `Added ${title.title}; no genre metadata was found`,
  }, { status: 201 });
}
