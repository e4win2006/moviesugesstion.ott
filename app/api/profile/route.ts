import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionProfileId } from "@/lib/auth";

export async function PATCH(request: Request) {
  const parsed = z.object({
    favoriteGenres: z.array(z.string()).min(1).max(30).optional(),
    preferredLanguages: z.array(z.string()).min(1).max(10).optional(),
    excludedLanguages: z.array(z.string()).min(0).max(10).optional(),
    preferredWatchProviders: z.array(z.string()).min(0).max(10).optional(),
  }).safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const profileId = await getSessionProfileId();
  const profile = profileId ? await prisma.profile.findUnique({ where: { id: profileId } }) : null;
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  const updated = await prisma.profile.update({ where: { id: profile.id }, data: parsed.data });
  return NextResponse.json({ profile: updated });
}
