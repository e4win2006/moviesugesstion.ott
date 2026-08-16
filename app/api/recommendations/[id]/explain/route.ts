import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { explainRecommendation } from "@/lib/openai";
import { scoreTitle } from "@/lib/recommendations";
import { TASTE_ANCHORS } from "@/lib/constants";

export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const title = await prisma.title.findUnique({ where: { id } });
  if (!title) return NextResponse.json({ error: "Title not found" }, { status: 404 });
  const scored = scoreTitle(title);
  const explanation = await explainRecommendation({
    title: title.title,
    genres: [...title.genres, ...title.keywords],
    score: scored.score,
    anchors: [...TASTE_ANCHORS],
    fallback: scored.reason,
  });
  return NextResponse.json({ explanation });
}
