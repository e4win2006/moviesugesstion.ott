"use client";

import { useMemo, useState } from "react";
import type { ScoredTitle } from "@/lib/recommendations";
import { RecommendationCard } from "@/components/recommendation-card";

const filters = [
  { id: "all", label: "All" },
  { id: "tech", label: "Tech & hacking", tags: ["Cybersecurity", "Hacking", "Tech Drama"] },
  { id: "conspiracy", label: "Conspiracy", tags: ["Government Conspiracy", "Political Thriller", "Intelligence Agencies"] },
  { id: "scifi", label: "AI & Sci-Fi", tags: ["Artificial Intelligence", "Sci-Fi", "Dystopian Future", "Space Exploration"] },
  { id: "crime", label: "Crime", tags: ["Crime Thriller", "Mystery", "Detective"] },
  { id: "completed", label: "Completed series" },
];

export function DiscoverBrowser({ items }: { items: ScoredTitle[] }) {
  const [activeFilter, setActiveFilter] = useState("all");

  const filtered = useMemo(() => {
    if (activeFilter === "all") return items;
    if (activeFilter === "completed") return items.filter((item) => item.completedSeries);
    const filterRule = filters.find((f) => f.id === activeFilter);
    if (!filterRule || !filterRule.tags) return items;
    return items.filter((item) => {
      const tags = [...item.genres, ...item.keywords];
      return filterRule.tags.some((tag) => tags.includes(tag));
    });
  }, [items, activeFilter]);

  return (
    <>
      <div className="mt-8 flex flex-wrap gap-2">
        {filters.map((filter) => {
          const active = activeFilter === filter.id;
          return (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className={`rounded-full px-4 py-2 text-xs font-bold transition ${
                active ? "bg-lime text-ink" : "border border-white/10 bg-white/[.04] text-zinc-400 hover:text-white"
              }`}
            >
              {filter.label}
            </button>
          );
        })}
      </div>
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-5 xl:grid-cols-6">
        {filtered.map((title) => (
          <RecommendationCard key={title.id} item={title} />
        ))}
      </div>
      {filtered.length === 0 && (
        <p className="mt-12 text-center text-sm text-zinc-500">No recommended titles match this filter.</p>
      )}
    </>
  );
}
