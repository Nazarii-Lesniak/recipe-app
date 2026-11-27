import { getDb, isDatabaseConfigured } from "@recipes/db";
import { recipeIngredients, recipeSteps, recipes, savedRecipes } from "@recipes/db/schema";
import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireAuth } from "@/core/auth/session";
import { handleRouteError } from "@/shared/api/http";

export async function GET() {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json({ error: "service_unavailable" }, { status: 503 });
    }

    const user = await requireAuth();
    const db = getDb();

    const ownRecipes = await db
      .select()
      .from(recipes)
      .where(and(eq(recipes.authorId, user.id), isNull(recipes.deletedAt)))
      .orderBy(desc(recipes.updatedAt));

    const savedLinks = await db
      .select({ recipeId: savedRecipes.recipeId, savedAt: savedRecipes.savedAt })
      .from(savedRecipes)
      .where(eq(savedRecipes.userId, user.id));

    const savedIds = savedLinks.map((s) => s.recipeId);
    const bookmarkedRecipes =
      savedIds.length > 0
        ? await db
            .select()
            .from(recipes)
            .where(and(inArray(recipes.id, savedIds), isNull(recipes.deletedAt)))
        : [];

    const allIds = Array.from(
      new Set([...ownRecipes.map((r) => r.id), ...bookmarkedRecipes.map((r) => r.id)]),
    );

    const [ingredients, steps] =
      allIds.length > 0
        ? await Promise.all([
            db
              .select()
              .from(recipeIngredients)
              .where(inArray(recipeIngredients.recipeId, allIds))
              .orderBy(asc(recipeIngredients.sortOrder)),
            db
              .select()
              .from(recipeSteps)
              .where(inArray(recipeSteps.recipeId, allIds))
              .orderBy(asc(recipeSteps.stepNumber)),
          ])
        : [[], []];

    const payload = {
      exportedAt: new Date().toISOString(),
      username: user.username,
      ownRecipes: ownRecipes.map((r) => ({
        ...r,
        ingredients: ingredients.filter((i) => i.recipeId === r.id),
        steps: steps.filter((s) => s.recipeId === r.id),
      })),
      savedRecipes: bookmarkedRecipes.map((r) => ({
        ...r,
        ingredients: ingredients.filter((i) => i.recipeId === r.id),
        steps: steps.filter((s) => s.recipeId === r.id),
      })),
    };

    return new NextResponse(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="recipes-${user.username}.json"`,
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
