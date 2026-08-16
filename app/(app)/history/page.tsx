import { CheckCircle2, Clock3, Film, Tv } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSessionProfileId } from "@/lib/auth";

export const dynamic = "force-dynamic";

type HistoryItem = {
  id: string;
  title: {
    title: string;
    type: string;
    year: number | null;
    genres: string[];
    imdbRating: number | null;
  };
  dateWatched: Date | null;
};

const fallback: HistoryItem[] = [
  { id: "1", title: { title: "The Boys", type: "TV", year: 2019, genres: ["Action", "Crime Thriller"], imdbRating: 8.6 }, dateWatched: new Date() },
  { id: "2", title: { title: "Gen V", type: "TV", year: 2023, genres: ["Action", "Mystery"], imdbRating: 7.7 }, dateWatched: new Date() },
  { id: "3", title: { title: "Mr. Robot", type: "TV", year: 2015, genres: ["Hacking", "Psychological Thriller"], imdbRating: 8.5 }, dateWatched: new Date() },
  { id: "4", title: { title: "Person of Interest", type: "TV", year: 2011, genres: ["Artificial Intelligence", "Crime Thriller"], imdbRating: 8.5 }, dateWatched: new Date() },
];

export default async function HistoryPage() {
  let entries: HistoryItem[];
  try {
    const profileId = await getSessionProfileId();
    const profile = profileId ? await prisma.profile.findUnique({ where: { id: profileId } }) : null;
    if (!profile) throw new Error();
    entries = await prisma.watchEntry.findMany({
      where: { profileId: profile.id, status: "WATCHED" },
      include: { title: true },
      orderBy: { dateWatched: "desc" },
    });
  } catch {
    entries = fallback;
  }
  return (
    <div className="py-6">
      <p className="eyebrow">Your anti-repeat ledger</p>
      <h1 className="mt-2 text-4xl font-black tracking-tight">Watch history.</h1>
      <p className="mt-3 text-sm text-zinc-400">{entries.length} titles are currently protected from repeat recommendations.</p>
      <div className="glass mt-8 overflow-hidden rounded-3xl">
        {entries.map((entry, index) => {
          const Icon = entry.title.type === "MOVIE" ? Film : Tv;
          return (
            <div key={entry.id} className={`flex items-center gap-4 p-4 sm:p-5 ${index ? "border-t border-white/[.06]" : ""}`}>
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/[.05] text-zinc-500"><Icon size={18} /></span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{entry.title.title}</p>
                <p className="mt-1 truncate text-xs text-zinc-500">{entry.title.year} · {entry.title.genres.slice(0, 2).join(" · ")}</p>
              </div>
              <p className="hidden items-center gap-1.5 text-xs text-zinc-500 sm:flex"><Clock3 size={13} /> {entry.dateWatched ? new Date(entry.dateWatched).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" }) : "Imported"}</p>
              <span className="flex items-center gap-1 rounded-full bg-lime/10 px-2.5 py-1.5 text-[10px] font-bold text-lime"><CheckCircle2 size={12} /> Watched</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
