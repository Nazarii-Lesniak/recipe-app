import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";
import { env } from "@/core/env";

export function isAiConfigured(): boolean {
  return Boolean(env.GOOGLE_GENERATIVE_AI_API_KEY || env.OPENAI_API_KEY);
}

export function getAiModel(): LanguageModel | null {
  if (env.GOOGLE_GENERATIVE_AI_API_KEY) {
    const google = createGoogleGenerativeAI({
      apiKey: env.GOOGLE_GENERATIVE_AI_API_KEY,
    });
    return google(env.AI_MODEL ?? "gemini-2.5-flash");
  }

  if (env.OPENAI_API_KEY) {
    const openai = createOpenAI({
      apiKey: env.OPENAI_API_KEY,
      baseURL: env.AI_BASE_URL,
    });
    return openai(env.AI_MODEL ?? "gpt-4o-mini");
  }

  return null;
}
