import { NextResponse } from "next/server";
import { getOttFeed } from "@/lib/ott";

export async function GET() {
  return NextResponse.json(await getOttFeed());
}
