/**
 * Lightweight 2-layer neural network for personalised movie recommendations.
 *
 * Architecture : 42 inputs → 16 hidden (ReLU) → 1 output (sigmoid)
 * Training     : online stochastic gradient descent on user feedback
 * Persistence  : weights stored in localStorage so the model improves over sessions
 * Cold start   : pre-biased toward the user's PREFERRED_GENRES via synthetic training
 *
 * No external ML libraries required — pure TypeScript math.
 */

// ─── Genre + language vocabulary ─────────────────────────────────────────────

export const NN_GENRES = [
  "Action", "Adventure", "Animation", "Comedy", "Crime", "Documentary",
  "Drama", "Family", "Fantasy", "History", "Horror", "Mystery",
  "Science Fiction", "Sci-Fi", "Thriller", "War", "Western",
  "Cybersecurity", "Hacking", "Tech Drama", "Government Conspiracy",
  "Political Thriller", "Intelligence Agencies", "Artificial Intelligence",
] as const;

export const NN_LANGUAGES = ["en", "ml", "ko", "de", "ja", "fr"] as const;

// Input dims: 24 genre flags + 6 language flags + 4 numerics + 2 type flags = 36
export const INPUT_SIZE = NN_GENRES.length + NN_LANGUAGES.length + 4 + 2;
const HIDDEN_SIZE = 16;
const LR = 0.02; // learning rate
const STORAGE_KEY = "watcher_nn_v2";

// ─── Activation functions ─────────────────────────────────────────────────────

const sigmoid = (x: number) => 1 / (1 + Math.exp(-Math.max(-20, Math.min(20, x))));
const relu = (x: number) => Math.max(0, x);
const reluGrad = (x: number) => (x > 0 ? 1 : 0);

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NNWeights {
  w1: number[][]; // [INPUT_SIZE][HIDDEN_SIZE]
  b1: number[];   // [HIDDEN_SIZE]
  w2: number[];   // [HIDDEN_SIZE]
  b2: number;
  trainedSamples: number;
}

// ─── Weight initialisation ────────────────────────────────────────────────────

function randW() {
  // Xavier/Glorot initialisation for better convergence
  return (Math.random() - 0.5) * Math.sqrt(2 / (INPUT_SIZE + HIDDEN_SIZE));
}

export function initWeights(): NNWeights {
  return {
    w1: Array.from({ length: INPUT_SIZE }, () =>
      Array.from({ length: HIDDEN_SIZE }, randW),
    ),
    b1: new Array(HIDDEN_SIZE).fill(0),
    w2: Array.from({ length: HIDDEN_SIZE }, randW),
    b2: 0,
    trainedSamples: 0,
  };
}

// ─── Feature engineering ──────────────────────────────────────────────────────

export interface TitleFeatures {
  genres: string[];
  keywords?: string[];
  language: string;
  imdbRating?: number | null;
  rottenTomatoesScore?: number | null;
  tmdbRating?: number | null;
  popularity?: number | null;
  year?: number | null;
  type: "MOVIE" | "TV";
}

export function buildFeatureVector(title: TitleFeatures): number[] {
  const allTags = [
    ...(title.genres || []),
    ...(title.keywords || []),
  ].map((t) => t.toLowerCase());

  // 1. Genre one-hot (24 dims)
  const genreVec = NN_GENRES.map((g) =>
    allTags.includes(g.toLowerCase()) ? 1 : 0,
  );

  // 2. Language one-hot (6 dims)
  const langVec = NN_LANGUAGES.map((l) => (l === title.language ? 1 : 0));

  // 3. Normalised numerics (4 dims)
  const imdb = Math.min(1, (title.imdbRating ?? title.tmdbRating ?? 0) / 10);
  const rt = Math.min(
    1,
    (title.rottenTomatoesScore ?? (title.tmdbRating ?? 0) * 10) / 100,
  );
  const pop = Math.min(1, Math.log10(Math.max(title.popularity ?? 1, 1)) / 4);
  const year = title.year
    ? Math.max(0, Math.min(1, (title.year - 1990) / 40))
    : 0.5;

  // 4. Type flags (2 dims)
  const isMovie = title.type === "MOVIE" ? 1 : 0;
  const isTV = title.type === "TV" ? 1 : 0;

  return [...genreVec, ...langVec, imdb, rt, pop, year, isMovie, isTV];
}

// ─── Forward pass ─────────────────────────────────────────────────────────────

function forward(w: NNWeights, x: number[]) {
  // Hidden layer
  const preact = w.b1.map((bias, j) => {
    let s = bias;
    for (let i = 0; i < x.length; i++) s += x[i] * w.w1[i][j];
    return s;
  });
  const hidden = preact.map(relu);

  // Output neuron
  let out = w.b2;
  for (let j = 0; j < HIDDEN_SIZE; j++) out += hidden[j] * w.w2[j];

  return { preact, hidden, output: sigmoid(out) };
}

// ─── Inference ────────────────────────────────────────────────────────────────

export function predict(weights: NNWeights, x: number[]): number {
  return forward(weights, x).output;
}

export function scoreWithNN(weights: NNWeights, title: TitleFeatures): number {
  return Math.round(predict(weights, buildFeatureVector(title)) * 100);
}

// ─── Training (online SGD) ────────────────────────────────────────────────────

export function train(
  weights: NNWeights,
  x: number[],
  target: number,
): NNWeights {
  const { preact, hidden, output } = forward(weights, x);

  // Output error
  const dOut = output - target;

  // Gradients for hidden→output
  const newW2 = weights.w2.map((w, j) => w - LR * dOut * hidden[j]);
  const newB2 = weights.b2 - LR * dOut;

  // Backprop through ReLU
  const dHidden = hidden.map((_, j) => dOut * weights.w2[j] * reluGrad(preact[j]));

  // Gradients for input→hidden
  const newW1 = weights.w1.map((row, i) =>
    row.map((w, j) => w - LR * dHidden[j] * x[i]),
  );
  const newB1 = weights.b1.map((b, j) => b - LR * dHidden[j]);

  return {
    w1: newW1,
    b1: newB1,
    w2: newW2,
    b2: newB2,
    trainedSamples: weights.trainedSamples + 1,
  };
}

// ─── Feedback-to-target mapping ───────────────────────────────────────────────

export function trainOnFeedback(
  weights: NNWeights,
  title: TitleFeatures,
  feedbackType: "LIKE" | "FAVORITE" | "DISLIKE" | "SKIP",
): NNWeights {
  const target =
    feedbackType === "FAVORITE"
      ? 1.0
      : feedbackType === "LIKE"
        ? 0.85
        : feedbackType === "SKIP"
          ? 0.35
          : 0.05; // DISLIKE

  const x = buildFeatureVector(title);
  // Train 3 times on strong feedback signals for faster convergence
  const reps = feedbackType === "FAVORITE" || feedbackType === "DISLIKE" ? 3 : 1;
  let w = weights;
  for (let i = 0; i < reps; i++) w = train(w, x, target);
  return w;
}

// ─── localStorage persistence ─────────────────────────────────────────────────

export function loadWeights(): NNWeights {
  if (typeof window === "undefined") return initWeights();
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as NNWeights;
      // Validate shape
      if (
        Array.isArray(parsed.w1) &&
        parsed.w1.length === INPUT_SIZE &&
        Array.isArray(parsed.b1) &&
        parsed.b1.length === HIDDEN_SIZE
      ) {
        return parsed;
      }
    }
  } catch {
    /* storage unavailable */
  }
  return initWeights();
}

export function saveWeights(weights: NNWeights): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(weights));
  } catch {
    /* quota exceeded — ignore */
  }
}

// ─── Warm start from preferred genres ────────────────────────────────────────

/**
 * Pre-bias the network toward the user's preferred genres
 * by running 60 synthetic positive training examples.
 * Called once on first load when no stored weights exist.
 */
export function warmStartWeights(preferredGenres: readonly string[]): NNWeights {
  let w = initWeights();
  const synthetic: TitleFeatures = {
    genres: preferredGenres.slice(0, 8) as string[],
    keywords: [],
    language: "en",
    imdbRating: 8.5,
    rottenTomatoesScore: 88,
    popularity: 250,
    year: 2023,
    type: "TV",
  };
  const x = buildFeatureVector(synthetic);
  for (let i = 0; i < 60; i++) w = train(w, x, 0.9);
  w.trainedSamples = 0; // don't count synthetic examples
  return w;
}
