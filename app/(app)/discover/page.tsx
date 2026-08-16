import { getAdvisorData } from "@/lib/data";
import { DiscoverBrowser } from "@/components/discover-browser";

export const dynamic = "force-dynamic";

export default async function DiscoverPage() {
  const data = await getAdvisorData();
  return (
    <div className="py-6">
      <p className="eyebrow">Personalized feed</p>
      <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">Discover your next obsession.</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">Ranked with genre affinity, taste-neighbor signals, IMDb quality, and Rotten Tomatoes consensus. Anything watched, rejected, or hidden is removed first.</p>
      <DiscoverBrowser items={data.titles} />
    </div>
  );
}

