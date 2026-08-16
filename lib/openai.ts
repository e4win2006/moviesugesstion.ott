import OpenAI from "openai";

export async function explainRecommendation(input: {
  title: string;
  genres: string[];
  score: number;
  anchors: string[];
  fallback: string;
}) {
  if (!process.env.OPENAI_API_KEY) return input.fallback;
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    messages: [
      {
        role: "user",
        content: `In one warm sentence under 32 words, explain why Edwin should watch "${input.title}". Score: ${input.score}/100. Genres: ${input.genres.join(", ")}. Loved titles: ${input.anchors.join(", ")}. Do not invent plot facts.`,
      },
    ],
    max_tokens: 70,
  });
  return response.choices[0]?.message?.content?.trim() || input.fallback;
}

