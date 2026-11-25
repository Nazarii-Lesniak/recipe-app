import { env } from "@/core/env";

export async function sendModerationTelegramNotification({
  title,
  username,
  slug,
  locale,
}: {
  title: string;
  username: string;
  slug: string;
  locale: string;
}): Promise<void> {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) {
    return;
  }

  const baseUrl = env.NEXT_PUBLIC_APP_URL ?? env.BETTER_AUTH_URL ?? "http://localhost:3000";
  const recipeUrl = `${baseUrl}/${locale}/recipes/${slug}`;
  const modUrl = `${baseUrl}/${locale}/admin/moderation`;

  const text = [
    `🍳 Новий публічний рецепт на перевірку`,
    `Назва: ${title}`,
    `Автор: @${username}`,
    `Перегляд: ${recipeUrl}`,
    `Модерація: ${modUrl}`,
  ].join("\n");

  try {
    await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: env.TELEGRAM_CHAT_ID,
        text,
        disable_web_page_preview: false,
      }),
      signal: AbortSignal.timeout(5_000),
    });
  } catch (error) {
    console.error("Telegram moderation notification failed:", error);
  }
}
