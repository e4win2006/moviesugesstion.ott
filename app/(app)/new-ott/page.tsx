import { CalendarDays, Clapperboard, Film, KeyRound, Tv } from "lucide-react";
import { getOttFeed } from "@/lib/ott";
import { RecommendationCard } from "@/components/recommendation-card";

export const dynamic = "force-dynamic";

export default async function NewOttPage() {
  const feed = await getOttFeed();
  const updated = new Date(feed.updatedAt).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="py-6">
      <p className="eyebrow">Fresh streaming picks</p>
      <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">New on OTT.</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
        Recently released movies and web series, ranked for your profile and cleared by the anti-repeat filter.
      </p>

      <div className={`mt-6 flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm ${feed.live ? "border-lime/20 bg-lime/[.06] text-lime" : "border-amber-300/20 bg-amber-300/[.06] text-amber-100"}`}>
        {feed.live ? <CalendarDays className="mt-0.5 shrink-0" size={17} /> : <KeyRound className="mt-0.5 shrink-0" size={17} />}
        <div>
          <p className="font-bold">
            {feed.live ? `Live India OTT catalog · updated ${updated}` : "Recent local catalog preview"}
          </p>
          <p className="mt-1 text-xs opacity-70">
            {feed.live
              ? `Subscription, free, and ad-supported releases from the last ${feed.windowDays} days.`
              : "Add TMDB_API_KEY to .env to enable live India streaming-release discovery and automatic daily updates."}
          </p>
        </div>
      </div>

      <OttSection icon={Film} eyebrow="Fresh films" title="Newly released movies" items={feed.movies} />
      <OttSection icon={Tv} eyebrow="Fresh episodes & premieres" title="New series and web series" items={feed.series} />

      {!feed.movies.length && !feed.series.length && (
        <section className="glass mt-10 grid min-h-64 place-items-center rounded-3xl p-8 text-center">
          <div>
            <Clapperboard className="mx-auto text-zinc-600" size={34} />
            <h2 className="mt-4 text-xl font-black">No recent titles loaded yet.</h2>
            <p className="mt-2 max-w-md text-sm text-zinc-500">
              Configure the TMDB API key, then revisit this page to load current OTT movies and web series available in India.
            </p>
          </div>
        </section>
      )}
    </div>
  );
}

function OttSection({
  icon: Icon,
  eyebrow,
  title,
  items,
}: {
  icon: typeof Film;
  eyebrow: string;
  title: string;
  items: Awaited<ReturnType<typeof getOttFeed>>["movies"];
}) {
  if (!items.length) return null;
  return (
    <section className="mt-12">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-lime/10 text-lime"><Icon size={18} /></span>
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2 className="mt-1 text-2xl font-black">{title}</h2>
        </div>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-5 xl:grid-cols-6">
        {items.map((item) => <RecommendationCard key={item.id} item={item} />)}
      </div>
    </section>
  );
}
