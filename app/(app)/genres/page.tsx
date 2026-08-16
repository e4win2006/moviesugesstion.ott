import { GenreBrowser } from "@/components/genre-browser";
import { TmdbSetupBanner } from "@/components/tmdb-setup-banner";

export const dynamic = "force-dynamic";

export default async function GenresPage() {
  const hasTmdb = !!process.env.TMDB_API_KEY;
  return (
    <div className="py-6">
      <p className="eyebrow">Explore by Genre & Rating</p>
      <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">
        Latest Movies & Shows.
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
        Browse top-rated Hollywood blockbusters, British gems, Malayalam hits, and
        web series — live from TMDB, sorted by IMDb rating, Rotten Tomatoes,
        release year, or your personal AI match score.
      </p>
      <TmdbSetupBanner hasTmdb={hasTmdb} />
      <GenreBrowser initialHasTmdb={hasTmdb} />
    </div>
  );
}
