import { NextResponse } from "next/server";
import { z } from "zod";
import { timingSafeEqual } from "crypto";
import { COOKIE_NAME, createSession, type ProfileId } from "@/lib/auth";

const profiles: Record<ProfileId, { name: string; pin: string }> = {
  edwin: { name: "Edwin", pin: process.env.EDWIN_PIN || process.env.ADVISOR_PIN || "1234" },
  jeswin: { name: "Jeswin", pin: process.env.JESWIN_PIN || "2009" },
};

export async function POST(request: Request) {
  const parsed = z.object({
    profileId: z.enum(["edwin", "jeswin"]),
    pin: z.string().min(1).max(64),
  }).safeParse(await request.json());
  const selected = parsed.success ? profiles[parsed.data.profileId] : null;
  const expected = Buffer.from(selected?.pin || "");
  const supplied = Buffer.from(parsed.success ? parsed.data.pin : "");
  const valid = expected.length === supplied.length && timingSafeEqual(expected, supplied);
  if (!parsed.success || !valid) {
    return NextResponse.json({ error: "Invalid PIN" }, { status: 401 });
  }
  const response = NextResponse.json({ ok: true, profile: profiles[parsed.data.profileId].name });
  response.cookies.set(COOKIE_NAME, await createSession(parsed.data.profileId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
