import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE_NAME = "watch-advisor-session";
const PROFILE_IDS = ["edwin", "jeswin"] as const;
export type ProfileId = (typeof PROFILE_IDS)[number];

function secret() {
  return new TextEncoder().encode(
    process.env.AUTH_SECRET || "development-only-change-this-secret",
  );
}

export async function createSession(profileId: ProfileId) {
  return new SignJWT({ role: "viewer", profileId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret());
}

export async function getSessionProfileId(): Promise<ProfileId | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return PROFILE_IDS.includes(payload.profileId as ProfileId)
      ? payload.profileId as ProfileId
      : null;
  } catch {
    return null;
  }
}

export async function isAuthenticated() {
  return Boolean(await getSessionProfileId());
}

export { COOKIE_NAME };
