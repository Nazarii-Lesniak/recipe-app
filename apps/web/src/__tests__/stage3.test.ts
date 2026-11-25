import { aiImportRequestSchema } from "@recipes/domain";
import { describe, expect, it } from "vitest";
import { importRecipeFromSource } from "../features/ai-import/server/ai-import-service";
import { isAiConfigured } from "../features/ai-import/server/ai-provider";
import { sendModerationTelegramNotification } from "../features/moderation/server/telegram";
import { HttpError } from "../shared/api/http";

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
