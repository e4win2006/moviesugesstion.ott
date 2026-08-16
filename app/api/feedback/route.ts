import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionProfileId } from "@/lib/auth";

import { findOrCreateTitleByTmdbId } from "@/lib/title-enrichment";
import { MediaType } from "@prisma/client";

const schema = z.object({
  titleId: z.string().optional(),
  tmdbId: z.number().optional(),
  type: z.enum(["MOVIE", "TV"]).optional(),
  action: z.enum(["LIKE", "DISLIKE", "FAVORITE", "HIDDEN", "REJECTED", "WATCHED"]),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const profileId = await getSessionProfileId();
  const profile = profileId ? await prisma.profile.findUnique({ where: { id: profileId } }) : null;
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  
  let titleId = parsed.data.titleId;
  const { tmdbId, type, action } = parsed.data;

  if (!titleId) {
    if (tmdbId !== undefined && type) {
      try {
        const title = await findOrCreateTitleByTmdbId(tmdbId, type as MediaType);
        titleId = title.id;
      } catch (e) {
        console.error("Failed to enrich title for feedback action", e);
        return NextResponse.json({ error: "Title resolution failed" }, { status: 500 });
      }
    } else {
      return NextResponse.json({ error: "titleId or both tmdbId and type are required" }, { status: 400 });
    }
  }

  if (action === "WATCHED") {
    await prisma.watchEntry.upsert({
      where: { profileId_titleId: { profileId: profile.id, titleId } },
      update: { status: "WATCHED", dateWatched: new Date() },
      create: { profileId: profile.id, titleId, status: "WATCHED", dateWatched: new Date() },
    });
  } else if (action === "HIDDEN" || action === "REJECTED") {
    await prisma.exclusion.upsert({
      where: { profileId_titleId: { profileId: profile.id, titleId } },
      update: { type: action },
      create: { profileId: profile.id, titleId, type: action },
    });
  } else {
    await prisma.feedback.upsert({
      where: { profileId_titleId: { profileId: profile.id, titleId } },
      update: { type: action },
      create: { profileId: profile.id, titleId, type: action },
    });
  }
  return NextResponse.json({ ok: true, titleId });
}

