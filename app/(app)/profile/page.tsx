import { BrainCircuit, Clock3, Film, ShieldCheck, Tv } from "lucide-react";
import { getAdvisorData } from "@/lib/data";
import { ProfileSettings } from "@/components/profile-settings";
import { TitleRow } from "@/components/title-row";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const data = await getAdvisorData();
  return (
    <div className="py-6">
      <section className="glass overflow-hidden rounded-3xl">
        <div className="h-28 bg-[radial-gradient(circle_at_20%_20%,rgba(214,255,63,.35),transparent_22rem),linear-gradient(120deg,#192214,#12151a)]" />
        <div className="px-6 pb-7 sm:px-8">
          <div className="-mt-10 grid h-20 w-20 place-items-center rounded-2xl border-4 border-[#101318] bg-gradient-to-br from-lime to-emerald-500 text-3xl font-black text-ink">{data.profile.name.charAt(0).toUpperCase()}</div>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
            <div><h1 className="text-3xl font-black">{data.profile.name}</h1><p className="mt-1 text-sm text-zinc-500">Taste architect · profile active</p></div>
            <div className="flex items-center gap-2 rounded-full border border-lime/20 bg-lime/[.06] px-3 py-2 text-xs font-bold text-lime"><ShieldCheck size={14} /> Anti-repeat protection on</div>
          </div>
        </div>
      </section>
      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Movies", value: data.stats.movieCount, icon: Film },
          { label: "Series", value: data.stats.seriesCount, icon: Tv },
          { label: "Hours", value: data.stats.hours, icon: Clock3 },
          { label: "Accuracy", value: `${data.stats.accuracy}%`, icon: BrainCircuit },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="glass rounded-2xl p-5"><Icon size={17} className="text-lime" /><p className="mt-5 text-2xl font-black">{value}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-zinc-600">{label}</p></div>
        ))}
      </div>
      <TitleRow title={`${data.profile.name}'s favorite movies & shows`} eyebrow="Personal collection" items={data.favorites} />
      <ProfileSettings
        initialGenres={data.profile.favoriteGenres}
        initialPreferredLanguages={data.profile.preferredLanguages}
        initialExcludedLanguages={data.profile.excludedLanguages}
        initialWatchProviders={data.profile.preferredWatchProviders}
      />
    </div>
  );
}
