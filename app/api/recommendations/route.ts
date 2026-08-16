import { NextResponse } from "next/server";
import { getAdvisorData } from "@/lib/data";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const limit = Math.min(Number(searchParams.get("limit") || 20), 100);
  const data = await getAdvisorData();
  if (category) {
    const match = data.categories.find((item) => item.id === category);
    return NextResponse.json({ category: match?.title, recommendations: match?.titles.slice(0, limit) || [] });
  }
  return NextResponse.json({
    recommendations: data.titles.slice(0, limit),
    categories: data.categories.map(({ id, title }) => ({ id, title })),
    antiRepeatApplied: true,
  });
}
