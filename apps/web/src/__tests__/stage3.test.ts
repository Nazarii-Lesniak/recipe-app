import { aiImportRequestSchema } from "@recipes/domain";
import { APICallError, NoOutputGeneratedError, RetryError } from "ai";
import { describe, expect, it } from "vitest";
import { ZodError } from "zod";
import {
  importRecipeFromSource,
  mapAiExtractionError,
} from "../features/ai-import/server/ai-import-service";
import { isAiConfigured } from "../features/ai-import/server/ai-provider";
import { sendModerationTelegramNotification } from "../features/moderation/server/telegram";
import { HttpError } from "../shared/api/http";

function makeApiCallError(statusCode: number) {
  return new APICallError({
    message: `Provider HTTP ${statusCode}`,
    url: "https://generativelanguage.googleapis.com/v1beta/models/test:generateContent",
    requestBodyValues: {},
    statusCode,
  });
}

describe("AI import validation and SSRF guards", () => {
  it("validates AI import request modes", () => {
    expect(
      aiImportRequestSchema.safeParse({
        mode: "url",
        url: "https://example.com/recipe",
        targetLocale: "uk",
        keepOriginalLanguage: false,
      }).success,
    ).toBe(true);

    expect(
      aiImportRequestSchema.safeParse({
        mode: "url",
        targetLocale: "uk",
        keepOriginalLanguage: false,
      }).success,
    ).toBe(false);
  });

  it("blocks unsafe private URLs before fetching", async () => {
    await expect(
      importRecipeFromSource("u1", {
        mode: "url",
        url: "http://127.0.0.1:8080/internal",
        targetLocale: "uk",
        keepOriginalLanguage: false,
      }),
    ).rejects.toBeInstanceOf(HttpError);
  });

  it("reports unconfigured AI gracefully in dev without API keys", () => {
    expect(typeof isAiConfigured()).toBe("boolean");
  });

  it("rejects malformed image data URLs with HttpError(400)", async () => {
    await expect(
      importRecipeFromSource("u1", {
        mode: "image",
        imageDataUrl: "data:image/png;not-base64,abc",
        targetLocale: "uk",
        keepOriginalLanguage: false,
      }),
    ).rejects.toMatchObject({
      status: 400,
      message: "invalid_image_data_url",
    });
  });

  it("maps AI provider and parsing errors to structured HttpErrors", () => {
    const cases: Array<[number, number, string]> = [
      [400, 502, "ai_request_rejected"],
      [401, 502, "ai_auth_error"],
      [404, 502, "ai_model_not_found"],
      [429, 429, "ai_rate_limited"],
      [503, 503, "ai_temporarily_unavailable"],
    ];

    for (const [statusCode, expectedHttpStatus, expectedMessage] of cases) {
      const mapped = mapAiExtractionError(makeApiCallError(statusCode));
      expect(mapped).toBeInstanceOf(HttpError);
      expect(mapped.status).toBe(expectedHttpStatus);
      expect(mapped.message).toBe(expectedMessage);
    }

    const retried503 = new RetryError({
      message: "Failed after retries",
      reason: "maxRetriesExceeded",
      errors: [makeApiCallError(503)],
    });
    expect(mapAiExtractionError(retried503)).toMatchObject({
      status: 503,
      message: "ai_temporarily_unavailable",
    });

    expect(mapAiExtractionError(new NoOutputGeneratedError())).toMatchObject({
      status: 422,
      message: "ai_parse_failed",
    });

    expect(mapAiExtractionError(new ZodError([]))).toMatchObject({
      status: 422,
      message: "ai_parse_failed",
    });
  });
});

describe("Telegram moderation webhook graceful fallback", () => {
  it("resolves cleanly when TELEGRAM_BOT_TOKEN is unset", async () => {
    await expect(
      sendModerationTelegramNotification({
        title: "Борщ",
        username: "chef_demo",
        slug: "borshch",
        locale: "uk",
      }),
    ).resolves.toBeUndefined();
  });
});
