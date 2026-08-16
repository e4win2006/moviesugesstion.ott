import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { ScoredTitle } from "@/lib/recommendations";
import { RecommendationCard } from "@/components/recommendation-card";

export function TitleRow({ title, eyebrow, items }: { title: string; eyebrow?: string; items: ScoredTitle[] }) {
  if (!items.length) return null;
  return (
    <section className="mt-12">
      <div className="mb-5 flex items-end justify-between">
        <div>
          {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
          <h2 className="text-xl font-black tracking-tight sm:text-2xl">{title}</h2>
        </div>
        <Link href="/discover" className="flex items-center gap-1 text-xs font-bold text-zinc-500 hover:text-lime">View all <ArrowRight size={13} /></Link>
      </div>
      <div className="fade-edge grid grid-flow-col auto-cols-[155px] gap-3 overflow-x-auto pb-3 sm:auto-cols-[185px] sm:gap-4 lg:auto-cols-[205px]">
        {items.map((item) => <RecommendationCard key={item.id} item={item} />)}
      </div>
    </section>
  );
}
