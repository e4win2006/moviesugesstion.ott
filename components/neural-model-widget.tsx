"use client";

import { Zap } from "lucide-react";
import { useNeuralRecommender } from "@/components/neural-recommender-provider";

export function NeuralModelWidget() {
  const { trainedSamples, ready } = useNeuralRecommender();

  return (
    <div className="flex items-center gap-2 rounded-xl border border-lime/20 bg-lime/[.06] px-3 py-2 text-xs">
      <Zap size={13} className="text-lime" />
      <span className="font-semibold text-lime">Neural AI</span>
      {ready ? (
        <span className="text-zinc-400">
          {trainedSamples === 0
            ? "Warm-started · Like/Fav titles to train it"
            : `Trained on ${trainedSamples} interaction${trainedSamples === 1 ? "" : "s"}`}
        </span>
      ) : (
        <span className="text-zinc-600">Loading…</span>
      )}
    </div>
  );
}
