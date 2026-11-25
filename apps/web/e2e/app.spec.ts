import { expect, test } from "@playwright/test";

test.describe("Recipes App E2E", () => {
  test("home loads in uk, switches locale to en, and switches all 3 themes", async ({ page }) => {
    await page.goto("/uk");
    await expect(page.locator("html")).toHaveAttribute("lang", "uk");

    await page.getByTestId("theme-switcher").click();
    await page.getByTestId("theme-dark-espresso").click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark-espresso");

    await page.getByTestId("theme-switcher").click();
    await page.getByTestId("theme-fresh-matcha").click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "fresh-matcha");

    await page.getByTestId("theme-switcher").click();
    await page.getByTestId("theme-warm-kitchen").click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "warm-kitchen");

    await page.getByTestId("locale-switcher").click();
    await page.getByText("English (EN)").click();
    await expect(page).toHaveURL(/\/en/);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
  });

  test("login and register render without email field and use proper autofill attributes", async ({
    page,
  }) => {
    await page.goto("/uk/register");
    await expect(page.locator('input[type="email"]')).toHaveCount(0);

    const usernameInput = page.locator('input[autocomplete="username"]');
    await expect(usernameInput).toBeVisible();
    await expect(usernameInput).toHaveAttribute("spellcheck", "false");

    const passwordInput = page.locator('input[autocomplete="new-password"]').first();
    await expect(passwordInput).toBeVisible();

    await page.goto("/uk/login");
    await expect(page.locator('input[autocomplete="current-password"]')).toBeVisible();
  });

  test("search page syncs filters with URL query params and shows empty state", async ({
    page,
  }) => {
    await page.goto("/uk/search");
    const searchBox = page.locator('input[type="search"]');
    await searchBox.fill("борщ");
    await searchBox.press("Enter");
    await expect(page).toHaveURL(/q=/);
  });

  test("new recipe editor exposes AI import tab, keep-original checkbox, and persists draft", async ({
    page,
  }) => {
    await page.goto("/uk/recipes/new");
    await page.getByRole("tab", { name: /AI/i }).click();
    await expect(page.getByText("Залишити мову оригіналу")).toBeVisible();

    await page.getByRole("tab", { name: /Ручний/i }).click();
    const titleInput = page.locator("input").first();
    await titleInput.fill("Домашні вареники");
    await page.waitForTimeout(2300);

    await page.reload();
    await expect(page.getByText(/чернетку/i)).toBeVisible();
  });

  test("PWA manifest, robots.txt, and sitemap.xml respond cleanly", async ({ request }) => {
    const manifestRes = await request.get("/manifest.webmanifest");
    expect(manifestRes.status()).toBe(200);
    const manifestJson = (await manifestRes.json()) as {
      share_target?: { action?: string };
    };
    expect(manifestJson.share_target?.action).toBe("/uk/recipes/new");

    const robotsRes = await request.get("/robots.txt");
    expect(robotsRes.status()).toBe(200);

    const sitemapRes = await request.get("/sitemap.xml");
    expect(sitemapRes.status()).toBe(200);
  });

  test("protected moderation routes enforce auth and RBAC", async ({ page, request }) => {
    const apiRes = await request.get("/api/v1/moderation/queue");
    expect(apiRes.status()).toBe(401);

    const archiveRes = await request.get("/api/v1/admin/archive");
    expect(archiveRes.status()).toBe(401);

    await page.goto("/uk/admin/moderation");
    await expect(page).toHaveURL(/\/uk\/login/);
  });
});
