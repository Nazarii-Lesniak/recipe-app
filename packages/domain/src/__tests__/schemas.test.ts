import { describe, expect, it } from "vitest";
import {
  buildInternalEmail,
  generateUsernameCandidate,
  normalizeUsername,
  registerSchema,
  usernameSchema,
} from "../schemas/auth";
import { moderationActionSchema, recipeInputSchema } from "../schemas/recipe";

describe("auth schemas and username helpers", () => {
  it("validates allowed username characters and length", () => {
    expect(usernameSchema.safeParse("chef_nazarii.1").success).toBe(true);
    expect(usernameSchema.safeParse("ab").success).toBe(false);
    expect(usernameSchema.safeParse("bad-dash!").success).toBe(false);
  });

  it("normalizes usernames case-insensitively and builds internal synthetic email", () => {
    expect(normalizeUsername("  Chef_Olena  ")).toBe("chef_olena");
    expect(buildInternalEmail("Chef_Olena")).toBe("chef_olena@local.internal");
  });

  it("generates valid username candidates for OAuth users", () => {
    const candidate = generateUsernameCandidate("Олена Коваленко", "42");
    expect(usernameSchema.safeParse(candidate).success).toBe(true);
  });

  it("validates registerSchema without email and checks confirmPassword match", () => {
    expect(
      registerSchema.safeParse({
        username: "baker_01",
        password: "supersecretpassword",
        confirmPassword: "supersecretpassword",
      }).success,
    ).toBe(true);

    const mismatch = registerSchema.safeParse({
      username: "baker_01",
      password: "supersecretpassword",
      confirmPassword: "differentpassword",
    });
    expect(mismatch.success).toBe(false);
  });
});

describe("recipe and moderation schemas", () => {
  it("enforces recipe bounds from spec", () => {
    const valid = recipeInputSchema.safeParse({
      title: "Борщ класичний",
      description: "Традиційний український борщ",
      baseServings: 4,
      prepTimeMin: 20,
      cookTimeMin: 60,
      difficulty: "medium",
      visibility: "public",
      status: "active",
      locale: "uk",
      categorySlugs: ["soups"],
      tags: ["традиційне"],
      ingredients: [{ name: "Буряк", amount: 300, unit: "g", isScalable: true }],
      steps: [{ instruction: "Нарізати овочі та варити бульйон." }],
    });
    expect(valid.success).toBe(true);

    const emptyIngredients = recipeInputSchema.safeParse({
      title: "Порожній рецепт",
      ingredients: [],
      steps: [{ instruction: "Крок 1" }],
    });
    expect(emptyIngredients.success).toBe(false);
  });

  it("requires a reason when hiding a recipe in moderation", () => {
    expect(moderationActionSchema.safeParse({ action: "approved" }).success).toBe(true);
    expect(moderationActionSchema.safeParse({ action: "hidden" }).success).toBe(false);
    expect(
      moderationActionSchema.safeParse({ action: "hidden", reason: "Спам або дублікат" }).success,
    ).toBe(true);
  });
});
