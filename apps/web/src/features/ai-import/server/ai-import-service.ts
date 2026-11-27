import {
  type AiImportRequest,
  type AiParsedRecipe,
  aiLlmRecipeSchema,
  extractReadableTextFromHtml,
  extractRecipeFromHtml,
  isSafeExternalUrl,
  normalizeAiLlmRecipe,
  SEED_CATEGORIES,
} from "@recipes/domain";
import { APICallError, generateText, NoOutputGeneratedError, Output, RetryError } from "ai";
import { ZodError } from "zod";
import { findDuplicateSourceUrl } from "@/entities/recipe/server/recipe-mutations";
import { HttpError } from "@/shared/api/http";
import { getAiModel } from "./ai-provider";

function buildSystemPrompt(targetLocale: "uk" | "en", keepOriginalLanguage: boolean): string {
  const categoryList = SEED_CATEGORIES.map((c) => c.slug).join(", ");
  const languageRule = keepOriginalLanguage
    ? "Preserve the original language of the recipe (choose 'uk' or 'en' closest to the source text)."
    : `Translate all recipe text (title, description, ingredient names, notes, group names, steps, tags) cleanly into ${targetLocale === "uk" ? "Ukrainian (uk)" : "English (en)"}.`;

  return [
    "You are a culinary data extractor.",
    "Extract a structured recipe strictly matching the JSON schema.",
    "Extract ONLY facts explicitly present in the provided source text or image. NEVER invent, guess, or fabricate a recipe from site names (like TikTok or Instagram) or generic boilerplate.",
    'If the source does not contain an actual recipe with ingredients and preparation instructions, return an empty title "", empty ingredients array [], and empty steps array [].',
    "Preserve ingredient sections (e.g. 'Соус', 'Для тіста') in each ingredient's groupName when present.",
    languageRule,
    `Choose the best matching categorySlug from: ${categoryList}.`,
    "Use unit values strictly from: g, kg, ml, l, tsp, tbsp, cup, pcs, pinch, to_taste.",
    "For 'to taste' or non-scalable items (e.g. frying oil, salt to taste), set isScalable: false.",
  ].join(" ");
}

function parseImageDataUrl(imageDataUrl: string): { mediaType: string; data: string } {
  const match = imageDataUrl
    .trim()
    .match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+)$/);
  if (!match?.[1] || !match[2]) {
    throw new HttpError("invalid_image_data_url", 400);
  }
  const data = match[2].replace(/\s+/g, "");
  if (!data) {
    throw new HttpError("invalid_image_data_url", 400);
  }
  return { mediaType: match[1], data };
}

/**
 * Maps AI SDK / provider errors into user-actionable HTTP errors.
 */
export function mapAiExtractionError(error: unknown): HttpError {
  if (error instanceof HttpError) {
    return error;
  }

  const cause = RetryError.isInstance(error) ? error.lastError : error;

  if (APICallError.isInstance(cause)) {
    if (cause.statusCode === 401 || cause.statusCode === 403) {
      return new HttpError("ai_auth_error", 502);
    }
    if (cause.statusCode === 404) {
      return new HttpError("ai_model_not_found", 502);
    }
    if (cause.statusCode === 429) {
      return new HttpError("ai_rate_limited", 429);
    }
    if (
      cause.statusCode === 500 ||
      cause.statusCode === 502 ||
      cause.statusCode === 503 ||
      cause.statusCode === 504
    ) {
      return new HttpError("ai_temporarily_unavailable", 503);
    }
    if (cause.statusCode === 400) {
      return new HttpError("ai_request_rejected", 502);
    }
  }

  if (NoOutputGeneratedError.isInstance(cause) || cause instanceof ZodError) {
    return new HttpError("ai_parse_failed", 422);
  }

  return new HttpError("ai_parse_failed", 502);
}

async function runLlmExtraction(
  targetLocale: "uk" | "en",
  keepOriginalLanguage: boolean,
  content: string | { imageDataUrl: string },
): Promise<AiParsedRecipe> {
  const model = getAiModel();
  if (!model) {
    throw new HttpError("ai_not_configured", 503);
  }

  const system = buildSystemPrompt(targetLocale, keepOriginalLanguage);

  try {
    if (typeof content === "string") {
      const { output } = await generateText({
        model,
        system,
        maxRetries: 1,
        output: Output.object({ schema: aiLlmRecipeSchema }),
        prompt: `Extract recipe from the following content:\n\n${content}`,
      });
      return normalizeAiLlmRecipe(output, targetLocale);
    }

    const { mediaType, data } = parseImageDataUrl(content.imageDataUrl);
    const { output } = await generateText({
      model,
      system,
      maxRetries: 1,
      output: Output.object({ schema: aiLlmRecipeSchema }),
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Extract the full recipe from this screenshot image." },
            { type: "file", data, mediaType },
          ],
        },
      ],
    });

    return normalizeAiLlmRecipe(output, targetLocale);
  } catch (error) {
    console.error("AI recipe extraction failed:", error);
    throw mapAiExtractionError(error);
  }
}

export async function importRecipeFromSource(
  userId: string,
  request: AiImportRequest,
): Promise<{
  recipe: AiParsedRecipe;
  source: "json-ld" | "llm";
  duplicateWarning: boolean;
}> {
  if (request.mode === "url" && request.url) {
    if (!isSafeExternalUrl(request.url)) {
      throw new HttpError("unsafe_external_url", 400);
    }

    const duplicate = await findDuplicateSourceUrl(userId, request.url).catch(() => null);

    let response: Response;
    try {
      response = await fetch(request.url, {
        signal: AbortSignal.timeout(10_000),
        headers: {
          "User-Agent": "ClovekeepRecipeBot/1.0 (+https://recipes-app.local)",
          Accept: "text/html,application/xhtml+xml",
        },
      });
    } catch {
      throw new HttpError("url_fetch_failed", 422);
    }

    if (!response.ok) {
      throw new HttpError("url_fetch_failed", 422);
    }

    const html = (await response.text()).slice(0, 2_000_000);
    const jsonLdRecipe = extractRecipeFromHtml(html);

    if (jsonLdRecipe) {
      if (
        !request.keepOriginalLanguage &&
        jsonLdRecipe.locale !== request.targetLocale &&
        getAiModel()
      ) {
        const translated = await runLlmExtraction(
          request.targetLocale,
          false,
          JSON.stringify(jsonLdRecipe),
        );
        return {
          recipe: translated,
          source: "llm",
          duplicateWarning: Boolean(duplicate),
        };
      }

      return {
        recipe: jsonLdRecipe,
        source: "json-ld",
        duplicateWarning: Boolean(duplicate),
      };
    }

    const plainText = extractReadableTextFromHtml(html);
    if (plainText.length < 40) {
      throw new HttpError("empty_page_content", 422);
    }

    const parsed = await runLlmExtraction(
      request.targetLocale,
      request.keepOriginalLanguage,
      plainText,
    );

    return {
      recipe: parsed,
      source: "llm",
      duplicateWarning: Boolean(duplicate),
    };
  }

  if (request.mode === "text" && request.text) {
    const parsed = await runLlmExtraction(
      request.targetLocale,
      request.keepOriginalLanguage,
      request.text,
    );
    return { recipe: parsed, source: "llm", duplicateWarning: false };
  }

  if (request.mode === "image" && request.imageDataUrl) {
    parseImageDataUrl(request.imageDataUrl);
    const parsed = await runLlmExtraction(request.targetLocale, request.keepOriginalLanguage, {
      imageDataUrl: request.imageDataUrl,
    });
    return { recipe: parsed, source: "llm", duplicateWarning: false };
  }

  throw new HttpError("invalid_import_request", 400);
}
