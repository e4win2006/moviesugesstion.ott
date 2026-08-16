"use client";

/**
 * NeuralRecommenderProvider
 * ----------------------------------------------------------
 * Client-side React context that manages a tiny in-browser
 * neural network for personalised recommendation scoring.
 *
 * - Loads weights from localStorage on mount
 * - Pre-warms weights toward PREFERRED_GENRES on first run
 * - Exposes getScore(title) → 0-100 and trainFeedback()
 * - Saves updated weights to localStorage after each training step
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  type NNWeights,
  type TitleFeatures,
  buildFeatureVector,
  initWeights,
  loadWeights,
  predict,
  saveWeights,
  trainOnFeedback,
  warmStartWeights,
} from "@/lib/neural-net";
import { PREFERRED_GENRES } from "@/lib/constants";

// ─── Context type ─────────────────────────────────────────────────────────────

interface NeuralCtx {
  /** Neural net preference score 0-100 for a title */
  getScore: (title: TitleFeatures) => number;
  /**
   * Train the model on user feedback and persist updated weights.
   * Call this whenever the user presses Like / Favorite / Dislike.
   */
  trainFeedback: (
    title: TitleFeatures,
    type: "LIKE" | "FAVORITE" | "DISLIKE" | "SKIP",
  ) => void;
  /** How many samples the model has been trained on */
  trainedSamples: number;
  /** True once weights have been loaded from localStorage */
  ready: boolean;
}

const Ctx = createContext<NeuralCtx>({
  getScore: () => 50,
  trainFeedback: () => undefined,
  trainedSamples: 0,
  ready: false,
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export function NeuralRecommenderProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const weightsRef = useRef<NNWeights>(initWeights());
  const [ready, setReady] = useState(false);
  const [trainedSamples, setTrainedSamples] = useState(0);

  // Load (or warm-start) weights once on mount
  useEffect(() => {
    let w = loadWeights();
    if (w.trainedSamples === 0) {
      // First run — pre-bias toward preferred genres
      w = warmStartWeights(PREFERRED_GENRES);
      saveWeights(w);
    }
    weightsRef.current = w;
    setTrainedSamples(w.trainedSamples);
    setReady(true);
  }, []);

  const getScore = useCallback((title: TitleFeatures): number => {
    if (!ready) return 50;
    const x = buildFeatureVector(title);
    return Math.round(predict(weightsRef.current, x) * 100);
  }, [ready]);

  const trainFeedback = useCallback(
    (title: TitleFeatures, type: "LIKE" | "FAVORITE" | "DISLIKE" | "SKIP") => {
      const updated = trainOnFeedback(weightsRef.current, title, type);
      weightsRef.current = updated;
      saveWeights(updated);
      setTrainedSamples(updated.trainedSamples);
    },
    [],
  );

  return (
    <Ctx.Provider value={{ getScore, trainFeedback, trainedSamples, ready }}>
      {children}
    </Ctx.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useNeuralRecommender() {
  return useContext(Ctx);
}

/**
 * Convenience hook: returns the neural score for a single title.
 * Returns 50 (neutral) until the model is ready.
 */
export function useNeuralScore(title: TitleFeatures | null): number {
  const { getScore, ready } = useNeuralRecommender();
  if (!ready || !title) return 50;
  return getScore(title);
}
