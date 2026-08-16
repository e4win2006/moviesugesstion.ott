import Link from "next/link";
import { ArrowRight, BrainCircuit, Clapperboard, Clock3, ExternalLink, Film, Play, ShieldCheck, Sparkles, Star, Tv } from "lucide-react";
import { getAdvisorData } from "@/lib/data";
import { posterUrl } from "@/lib/utils";
import { ScoreRing } from "@/components/score-ring";
import { TitleRow } from "@/components/title-row";
import { getOttFeed } from "@/lib/ott";
import { TmdbSetupBanner } from "@/components/tmdb-setup-banner";
import { NeuralModelWidget } from "@/components/neural-model-widget";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const [data, ott] = await Promise.all([getAdvisorData(), getOttFeed()]);
  const hero = data.titles[0];
  const backdrop = posterUrl(hero?.backdropPath || hero?.posterPath, "original");

  const hasTmdb = !!process.env.TMDB_API_KEY;

  return (
    <div>
      {!data.databaseReady && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-300/20 bg-amber-300/[.06] px-4 py-2.5 text-xs text-amber-100">
          <ShieldCheck size={14} /> Preview mode · Connect and seed PostgreSQL to persist your activity.
        </div>
      )}
      <TmdbSetupBanner hasTmdb={hasTmdb} />
      <section className="glass relative min-h-[490px] overflow-hidden rounded-[1.75rem] sm:min-h-[540px]">
        <div className="absolute inset-0 bg-cover bg-center opacity-50" style={backdrop ? { backgroundImage: `url("${backdrop}")` } : undefined} />
        <div className="absolute inset-0 bg-gradient-to-r from-[#090b0f] via-[#090b0f]/85 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#090b0f] via-transparent to-transparent" />
        <div className="relative flex min-h-[490px] max-w-2xl flex-col justify-end p-6 sm:min-h-[540px] sm:p-12">
          <div className="mb-5 flex items-center gap-3">
            <ScoreRing score={hero?.score || 94} />
            <div>
              <p className="eyebrow">Your #1 match tonight</p>
              <p className="mt-1 text-xs text-zinc-400">Taste confidence · exceptionally high</p>
            </div>
          </div>
          <h1 className="max-w-xl text-5xl font-black tracking-[-.06em] sm:text-7xl">{hero?.title || "Severance"}</h1>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs font-bold text-zinc-300">
            <span>{hero?.year}</span>
            <span className="flex items-center gap-1 text-yellow-300"><Star size={12} fill="currentColor" /> IMDb {hero?.imdbRating?.toFixed(1)}</span>
            <span className="text-red-400">● {hero?.rottenTomatoesScore}% RT</span>
            <span className="rounded border border-white/15 px-1.5 py-0.5">TV</span>
          </div>
          <p className="mt-4 max-w-xl text-sm leading-6 text-zinc-300">{hero?.reason}</p>
          <div className="mt-6 flex flex-wrap gap-2 sm:gap-3">
            <a href={hero?.trailerUrl || `https://www.youtube.com/results?search_query=${encodeURIComponent((hero?.title || "Severance") + " official trailer")}`} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1.5 rounded-xl bg-white px-4 py-2.5 sm:px-5 sm:py-3 text-xs font-black text-ink active:scale-95"><Play size={14} fill="currentColor" /> Trailer</a>
            <a href={`/api/watch/jiohotstar?title=${encodeURIComponent(hero?.title || "Severance")}&type=${hero?.type === "MOVIE" ? "movie" : "tv"}`} target="_blank" rel="noreferrer" title="Search for this title on JioHotstar India" className="flex items-center justify-center gap-1.5 rounded-xl bg-lime px-4 py-2.5 sm:px-5 sm:py-3 text-xs font-black text-ink active:scale-95"><Clapperboard size={14} /> JioHotstar</a>
            <a href={`/api/watch/imdb?title=${encodeURIComponent(hero?.title || "Severance")}&year=${hero?.year || ""}&imdbId=${hero?.imdbId || ""}`} target="_blank" rel="noreferrer" title="Open IMDb watch options for this title" className="flex items-center justify-center gap-1.5 rounded-xl bg-[#f5c518] px-4 py-2.5 sm:px-5 sm:py-3 text-xs font-black text-black active:scale-95"><ExternalLink size={13} /> IMDb</a>
            <Link href={`/player?tmdbId=${hero?.tmdbId || 95396}&type=${hero?.type === "MOVIE" ? "movie" : "tv"}`} title="Play using VLC Web Player" className="flex items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/[.06] px-4 py-2.5 sm:px-5 sm:py-3 text-xs font-black active:scale-95"><Play size={13} fill="currentColor" /> VLC Player</Link>
            <Link href="/discover" className="flex items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/[.06] px-4 py-2.5 sm:px-5 sm:py-3 text-xs font-black active:scale-95">Why this? <BrainCircuit size={14} /></Link>
          </div>
        </div>
      </section>

      <section className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Movies watched", value: data.stats.movieCount, icon: Film, detail: "All time" },
          { label: "Series watched", value: data.stats.seriesCount, icon: Tv, detail: "No repeats" },
          { label: "Hours consumed", value: `${data.stats.hours}h`, icon: Clock3, detail: "Estimated" },
          { label: "Advisor accuracy", value: `${Math.round(data.stats.accuracy)}%`, icon: Sparkles, detail: "Based on feedback" },
        ].map(({ label, value, icon: Icon, detail }) => (
          <div key={label} className="glass rounded-2xl p-4 sm:p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{label}</p>
                <p className="mt-2 text-2xl font-black sm:text-3xl">{value}</p>
                <p className="mt-1 text-[10px] text-zinc-600">{detail}</p>
              </div>
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-lime/10 text-lime"><Icon size={17} /></span>
            </div>
          </div>
        ))}
      </section>

      <div className="mt-4">
        <NeuralModelWidget />
      </div>

      <section className="mt-8 overflow-hidden rounded-2xl border border-white/10 bg-white/[.04] p-5 sm:flex sm:items-center sm:justify-between">
        <div>
          <p className="eyebrow text-lime">Explore Catalog</p>
          <h2 className="mt-1 text-xl font-black">Browse Latest Movies & Shows by Genre & Rating</h2>
          <p className="mt-1 text-xs text-zinc-400">Sort by IMDb rating, Rotten Tomatoes consensus, release year, or filter by Movies vs. Shows.</p>
        </div>
        <Link href="/genres" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-lime px-4 py-2.5 text-xs font-black text-ink sm:mt-0">
          Explore Genres & Ratings <ArrowRight size={14} />
        </Link>
      </section>

      <TitleRow title="New OTT movies" eyebrow="Fresh streaming releases" items={ott.movies.slice(0, 10)} />
      <TitleRow title="New web series & shows" eyebrow="Just arrived" items={ott.series.slice(0, 10)} />

      {data.categories.slice(0, 5).map((category, index) => (
        <TitleRow
          key={category.id}
          title={category.title}
          eyebrow={index === 0 ? `Curated for ${data.profile.name}` : undefined}
          items={category.titles}
        />
      ))}

      <section className="mt-14 overflow-hidden rounded-3xl border border-lime/20 bg-gradient-to-r from-lime/[.12] to-emerald-500/[.04] p-6 sm:flex sm:items-center sm:justify-between sm:p-9">
        <div>
          <p className="eyebrow">Make the advisor sharper</p>
          <h2 className="mt-2 text-2xl font-black">Bring in your full watch history.</h2>
          <p className="mt-2 text-sm text-zinc-400">Import IMDb exports or a CSV. Every title becomes another anti-repeat guardrail.</p>
        </div>
        <Link href="/import" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-lime px-5 py-3 text-xs font-black text-ink sm:mt-0">Import history <ArrowRight size={14} /></Link>
      </section>
    </div>
  );
}
