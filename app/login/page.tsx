"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LockKeyhole, Sparkles } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [profileId, setProfileId] = useState<"edwin" | "jeswin">("edwin");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ profileId, pin }),
    });
    setLoading(false);
    if (!response.ok) {
      setError("That PIN doesn’t match.");
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden px-5">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(214,255,63,.13),transparent_28rem)]" />
      <div className="glass relative w-full max-w-md rounded-[2rem] p-7 sm:p-10">
        <div className="mb-8 flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-lime text-ink"><Sparkles /></span>
          <div>
            <p className="text-lg font-black">Family Watch Advisor</p>
            <p className="text-xs text-zinc-500">Two profiles. Two different tastes.</p>
          </div>
        </div>
        <p className="eyebrow mb-3">Private screening room</p>
        <h1 className="text-3xl font-black tracking-tight">Who&apos;s watching?</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-400">Choose your profile, then enter its private PIN.</p>
        <form onSubmit={submit} className="mt-8">
          <div className="mb-5 grid grid-cols-2 gap-3">
            {[
              { id: "edwin" as const, name: "Edwin", initial: "E" },
              { id: "jeswin" as const, name: "Jeswin", initial: "J" },
            ].map((profile) => (
              <button
                key={profile.id}
                type="button"
                onClick={() => { setProfileId(profile.id); setPin(""); setError(""); }}
                className={`rounded-2xl border p-4 text-left transition ${profileId === profile.id ? "border-lime bg-lime/10" : "border-white/10 bg-white/[.03]"}`}
              >
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-lime to-emerald-500 font-black text-ink">{profile.initial}</span>
                <span className="mt-3 block text-sm font-black">{profile.name}</span>
              </button>
            ))}
          </div>
          <label className="mb-2 block text-xs font-bold text-zinc-300">{profileId === "edwin" ? "Edwin" : "Jeswin"}&apos;s PIN</label>
          <div className="relative">
            <LockKeyhole className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={17} />
            <input
              autoFocus
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(event) => setPin(event.target.value)}
              className="h-13 w-full rounded-xl border border-white/10 bg-white/[.04] py-3.5 pl-11 pr-4 outline-none transition focus:border-lime/60"
              placeholder="••••"
            />
          </div>
          {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
          <button disabled={loading || !pin} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-lime py-3.5 text-sm font-black text-ink transition hover:bg-white disabled:opacity-50">
            {loading ? "Unlocking…" : "Open advisor"} <ArrowRight size={16} />
          </button>
        </form>
      </div>
    </main>
  );
}
