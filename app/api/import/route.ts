import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionProfileId } from "@/lib/auth";
import { findOrCreateEnrichedTitle } from "@/lib/title-enrichment";

const rowSchema = z.object({
  title: z.string().min(1),
  type: z.string().optional(),
  year: z.union([z.string(), z.number()]).optional(),
  imdbId: z.string().optional(),
  rating: z.union([z.string(), z.number()]).optional(),
  dateWatched: z.string().optional(),
});

export async function POST(request: Request) {
  const body = z.object({ rows: z.array(rowSchema).max(5000) }).safeParse(await request.json());
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  const profileId = await getSessionProfileId();
  const profile = profileId ? await prisma.profile.findUnique({ where: { id: profileId } }) : null;
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  let imported = 0;
  let enriched = 0;
  for (const row of body.data.rows) {
    const type = /tv|series/i.test(row.type || "") ? "TV" : "MOVIE";
    const existing = row.imdbId ? await prisma.title.findFirst({ where: { imdbId: row.imdbId } }) : null;
    const title = existing || await findOrCreateEnrichedTitle({
      title: row.title,
      type,
      year: row.year ? Number(row.year) || undefined : undefined,
      imdbId: row.imdbId,
      language: "en",
    });
    if (title.genres.length) enriched++;
    await prisma.watchEntry.upsert({
      where: { profileId_titleId: { profileId: profile.id, titleId: title.id } },
      update: { status: "WATCHED" },
      create: {
        profileId: profile.id,
        titleId: title.id,
        status: "WATCHED",
        dateWatched: row.dateWatched ? new Date(row.dateWatched) : undefined,
        source: "csv",
      },
    });
    imported++;
  }
  return NextResponse.json({ imported, enriched });
}
