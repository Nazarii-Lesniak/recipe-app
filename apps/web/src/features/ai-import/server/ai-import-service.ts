import {
  type AiImportRequest,
  type AiParsedRecipe,
  aiParsedRecipeSchema,
  extractRecipeFromHtml,
  isSafeExternalUrl,
  SEED_CATEGORIES,
} from "@recipes/domain";
import { generateText, Output } from "ai";
import { findDuplicateSourceUrl } from "@/entities/recipe/server/recipe-mutations";
import { HttpError } from "@/shared/api/http";
import { getAiModel } from "./ai-provider";

function stripHtmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 12_000);
}

function buildSystemPrompt(targetLocale: "uk" | "en", keepOriginalLanguage: boolean): string {
  const categoryList = SEED_CATEGORIES.map((c) => c.slug).join(", ");
  const languageRule = keepOriginalLanguage
    ? "Preserve the original language of the recipe (choose 'uk' or 'en' closest to the source text)."
    : `Translate all recipe text (title, description, ingredient names, notes, group names, steps, tags) cleanly into ${targetLocale === "uk" ? "Ukrainian (uk)" : "English (en)"}.`;

  return [
    "You are a culinary data extractor.",
    "Extract a structured recipe strictly matching the JSON schema.",
    languageRule,
    `Choose the best matching categorySlug from: ${categoryList}.`,
    "Use unit values strictly from: g, kg, ml, l, tsp, tbsp, cup, pcs, pinch, to_taste.",
    "For 'to taste' or non-scalable items (e.g. frying oil, salt to taste), set isScalable: false.",
  ].join(" ");
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

  if (typeof content === "string") {
    const { output } = await generateText({
      model,
      system,
      output: Output.object({ schema: aiParsedRecipeSchema }),
      prompt: `Extract recipe from the following content:\n\n${content}`,
    });
    return output;
  }

  const { output } = await generateText({
    model,
    system,
    output: Output.object({ schema: aiParsedRecipeSchema }),
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: "Extract the full recipe from this screenshot image." },
          { type: "image", image: content.imageDataUrl },
        ],
      },
    ],
  });

  return output;
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
          "User-Agent": "SmakolykRecipeBot/1.0 (+https://recipes-app.local)",
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

    const plainText = stripHtmlToText(html);
    if (plainText.length < 20) {
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
    if (!request.imageDataUrl.startsWith("data:image/")) {
      throw new HttpError("invalid_image_data_url", 400);
    }
    const parsed = await runLlmExtraction(
      request.targetLocale,
      request.keepOriginalLanguage,
      { imageDataUrl: request.imageDataUrl },
    );
    return { recipe: parsed, source: "llm", duplicateWarning: false };
  }

  throw new HttpError("invalid_import_request", 400);
}
