import { getDb, isDatabaseConfigured } from "@recipes/db";
import {
  categories,
  recipeCategories,
  recipeIngredients,
  recipeSteps,
  recipes,
  recipeTags,
  savedRecipes,
  tags,
  users,
} from "@recipes/db/schema";
import {
  createUniqueSlug,
  type IngredientUnit,
  type Locale,
  type ModerationStatus,
  type RecipeDifficulty,
  type RecipeInput,
  type RecipeStatus,
  type RecipeVisibility,
  slugifyRecipeTitle,
  type UserRole,
} from "@recipes/domain";
import { and, asc, desc, eq, inArray, isNull, ne, sql } from "drizzle-orm";
import { AuthError } from "@/core/auth/session";
import { HttpError } from "@/shared/api/http";
import type { RecipeCardDto, RecipeDetailDto } from "./recipe-service";

export function assertCanMutateRecipe(authorId: string, userId: string, userRole: UserRole): void {
  if (authorId !== userId && userRole !== "admin") {
    throw new AuthError("Only the author or admin can modify this recipe", 403);
  }
}

async function syncRecipeRelations(
  tx: Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0],
  recipeId: string,
  input: RecipeInput,
) {
  await tx.insert(recipeIngredients).values(
    input.ingredients.map((ing, index) => ({
      recipeId,
      sortOrder: index + 1,
      groupName: ing.groupName ?? null,
      name: ing.name,
      amount: ing.amount !== null && ing.amount !== undefined ? String(ing.amount) : null,
      unit: ing.unit,
      note: ing.note ?? null,
      isScalable: ing.isScalable,
    })),
  );

  await tx.insert(recipeSteps).values(
    input.steps.map((step, index) => ({
      recipeId,
      stepNumber: index + 1,
      instruction: step.instruction,
      timerSeconds: step.timerSeconds ?? null,
      imageUrl: step.imageUrl ?? null,
      imageKey: step.imageKey ?? null,
    })),
  );

  if (input.categorySlugs.length > 0) {
    const matchedCategories = await tx
      .select({ id: categories.id })
      .from(categories)
      .where(inArray(categories.slug, input.categorySlugs));

    if (matchedCategories.length > 0) {
      await tx.insert(recipeCategories).values(
        matchedCategories.map((c) => ({
          recipeId,
          categoryId: c.id,
        })),
      );
    }
  }

  const normalizedTagNames = Array.from(
    new Set(
      input.tags
        .map((t) => t.replace(/^#/, "").trim())
        .filter((t) => t.length > 0)
        .slice(0, 15),
    ),
  );

  for (const tagName of normalizedTagNames) {
    const slug = slugifyRecipeTitle(tagName);
    const [upserted] = await tx
      .insert(tags)
      .values({ slug, name: tagName })
      .onConflictDoUpdate({
        target: tags.slug,
        set: { name: tagName },
      })
      .returning({ id: tags.id });

    if (upserted) {
      await tx.insert(recipeTags).values({ recipeId, tagId: upserted.id }).onConflictDoNothing();
    }
  }
}

export async function createRecipe(userId: string, input: RecipeInput) {
  if (!isDatabaseConfigured()) {
    throw new HttpError("service_unavailable", 503);
  }

  const db = getDb();
  const slug = createUniqueSlug(input.title);

  return db.transaction(async (tx) => {
    const [inserted] = await tx
      .insert(recipes)
      .values({
        authorId: userId,
        slug,
        title: input.title,
        description: input.description,
        coverImageUrl: input.coverImageUrl ?? null,
        coverImageKey: input.coverImageKey ?? null,
        baseServings: input.baseServings,
        prepTimeMin: input.prepTimeMin,
        cookTimeMin: input.cookTimeMin,
        difficulty: input.difficulty,
        visibility: input.visibility,
        status: input.status,
        moderationStatus: "unreviewed",
        sourceUrl: input.sourceUrl ?? null,
        locale: input.locale,
      })
      .returning();

    if (!inserted) {
      throw new HttpError("recipe_create_failed", 500);
    }

    await syncRecipeRelations(tx, inserted.id, input);

    return inserted;
  });
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getRecipeByIdForEdit(
  idOrSlug: string,
  userId: string,
  userRole: UserRole,
): Promise<RecipeDetailDto | null> {
  if (!isDatabaseConfigured()) {
    return null;
  }

  const db = getDb();
  const lookupCondition = UUID_REGEX.test(idOrSlug)
    ? eq(recipes.id, idOrSlug)
    : eq(recipes.slug, idOrSlug);

  const rows = await db
    .select({
      recipe: recipes,
      authorUsername: users.username,
      authorName: users.name,
    })
    .from(recipes)
    .innerJoin(users, eq(recipes.authorId, users.id))
    .where(and(lookupCondition, isNull(recipes.deletedAt)))
    .limit(1);

  const row = rows[0];
  if (!row) {
    return null;
  }

  assertCanMutateRecipe(row.recipe.authorId, userId, userRole);

  const [ingredientRows, stepRows, catLinks, tagLinks] = await Promise.all([
    db
      .select()
      .from(recipeIngredients)
      .where(eq(recipeIngredients.recipeId, row.recipe.id))
      .orderBy(asc(recipeIngredients.sortOrder)),
    db
      .select()
      .from(recipeSteps)
      .where(eq(recipeSteps.recipeId, row.recipe.id))
      .orderBy(asc(recipeSteps.stepNumber)),
    db
      .select({ category: categories })
      .from(recipeCategories)
      .innerJoin(categories, eq(recipeCategories.categoryId, categories.id))
      .where(eq(recipeCategories.recipeId, row.recipe.id)),
    db
      .select({ tag: tags })
      .from(recipeTags)
      .innerJoin(tags, eq(recipeTags.tagId, tags.id))
      .where(eq(recipeTags.recipeId, row.recipe.id)),
  ]);

  return {
    id: row.recipe.id,
    authorId: row.recipe.authorId,
    slug: row.recipe.slug,
    title: row.recipe.title,
    description: row.recipe.description,
    coverImageUrl: row.recipe.coverImageUrl,
    coverImageKey: row.recipe.coverImageKey,
    baseServings: row.recipe.baseServings,
    prepTimeMin: row.recipe.prepTimeMin,
    cookTimeMin: row.recipe.cookTimeMin,
    difficulty: row.recipe.difficulty as RecipeDifficulty,
    visibility: row.recipe.visibility as RecipeVisibility,
    status: row.recipe.status as RecipeStatus,
    moderationStatus: row.recipe.moderationStatus as ModerationStatus,
    moderationNote: row.recipe.moderationNote,
    sourceUrl: row.recipe.sourceUrl,
    locale: row.recipe.locale as Locale,
    authorUsername: row.authorUsername ?? row.authorName,
    saveCount: 0,
    isSaved: false,
    forkedFrom: null,
    createdAt: row.recipe.createdAt.toISOString(),
    categories: catLinks.map((c) => c.category),
    tags: tagLinks.map((t) => t.tag),
    ingredients: ingredientRows.map((ing) => ({
      id: ing.id,
      sortOrder: ing.sortOrder,
      groupName: ing.groupName,
      name: ing.name,
      amount: ing.amount !== null ? Number(ing.amount) : null,
      unit: ing.unit as IngredientUnit,
      note: ing.note,
      isScalable: ing.isScalable,
    })),
    steps: stepRows,
  };
}

export async function updateRecipe(
  userId: string,
  userRole: UserRole,
  recipeId: string,
  input: RecipeInput,
) {
  if (!isDatabaseConfigured()) {
    throw new HttpError("service_unavailable", 503);
  }

  const db = getDb();

  return db.transaction(async (tx) => {
    const existingRows = await tx
      .select()
      .from(recipes)
      .where(and(eq(recipes.id, recipeId), isNull(recipes.deletedAt)))
      .limit(1);

    const existing = existingRows[0];
    if (!existing) {
      throw new HttpError("not_found", 404);
    }

    assertCanMutateRecipe(existing.authorId, userId, userRole);

    const [updated] = await tx
      .update(recipes)
      .set({
        title: input.title,
        description: input.description,
        coverImageUrl: input.coverImageUrl ?? null,
        coverImageKey: input.coverImageKey ?? null,
        baseServings: input.baseServings,
        prepTimeMin: input.prepTimeMin,
        cookTimeMin: input.cookTimeMin,
        difficulty: input.difficulty,
        visibility: input.visibility,
        status: input.status,
        sourceUrl: input.sourceUrl ?? null,
        locale: input.locale,
        moderationStatus:
          input.visibility === "public" && input.status === "active"
            ? "unreviewed"
            : existing.moderationStatus,
        moderationNote:
          input.visibility === "public" && input.status === "active"
            ? null
            : existing.moderationNote,
      })
      .where(eq(recipes.id, recipeId))
      .returning();

    await Promise.all([
      tx.delete(recipeIngredients).where(eq(recipeIngredients.recipeId, recipeId)),
      tx.delete(recipeSteps).where(eq(recipeSteps.recipeId, recipeId)),
      tx.delete(recipeCategories).where(eq(recipeCategories.recipeId, recipeId)),
      tx.delete(recipeTags).where(eq(recipeTags.recipeId, recipeId)),
    ]);

    await syncRecipeRelations(tx, recipeId, input);

    return updated ?? existing;
  });
}

export async function softDeleteRecipe(
  userId: string,
  userRole: UserRole,
  recipeId: string,
): Promise<{ id: string }> {
  if (!isDatabaseConfigured()) {
    throw new HttpError("service_unavailable", 503);
  }

  const db = getDb();
  const rows = await db
    .select({ id: recipes.id, authorId: recipes.authorId })
    .from(recipes)
    .where(and(eq(recipes.id, recipeId), isNull(recipes.deletedAt)))
    .limit(1);

  const row = rows[0];
  if (!row) {
    throw new HttpError("not_found", 404);
  }

  assertCanMutateRecipe(row.authorId, userId, userRole);

  await db.update(recipes).set({ deletedAt: new Date() }).where(eq(recipes.id, recipeId));
  return { id: row.id };
}

export async function restoreRecipe(
  userId: string,
  userRole: UserRole,
  recipeId: string,
): Promise<{ id: string }> {
  if (!isDatabaseConfigured()) {
    throw new HttpError("service_unavailable", 503);
  }

  const db = getDb();
  const rows = await db
    .select({ id: recipes.id, authorId: recipes.authorId })
    .from(recipes)
    .where(eq(recipes.id, recipeId))
    .limit(1);

  const row = rows[0];
  if (!row) {
    throw new HttpError("not_found", 404);
  }

  assertCanMutateRecipe(row.authorId, userId, userRole);

  await db.update(recipes).set({ deletedAt: null }).where(eq(recipes.id, recipeId));
  return { id: row.id };
}

export async function forkRecipe(userId: string, sourceRecipeId: string) {
  if (!isDatabaseConfigured()) {
    throw new HttpError("service_unavailable", 503);
  }

  const db = getDb();

  return db.transaction(async (tx) => {
    const sourceRows = await tx
      .select()
      .from(recipes)
      .where(and(eq(recipes.id, sourceRecipeId), isNull(recipes.deletedAt)))
      .limit(1);

    const source = sourceRows[0];
    if (!source) {
      throw new HttpError("not_found", 404);
    }

    const canFork =
      source.authorId === userId ||
      (source.visibility === "public" &&
        source.status === "active" &&
        source.moderationStatus !== "hidden");

    if (!canFork) {
      throw new AuthError("Cannot fork this recipe", 403);
    }

    const [ingredientRows, stepRows, categoryRows, tagRows] = await Promise.all([
      tx
        .select()
        .from(recipeIngredients)
        .where(eq(recipeIngredients.recipeId, source.id))
        .orderBy(asc(recipeIngredients.sortOrder)),
      tx
        .select()
        .from(recipeSteps)
        .where(eq(recipeSteps.recipeId, source.id))
        .orderBy(asc(recipeSteps.stepNumber)),
      tx.select().from(recipeCategories).where(eq(recipeCategories.recipeId, source.id)),
      tx.select().from(recipeTags).where(eq(recipeTags.recipeId, source.id)),
    ]);

    const [forked] = await tx
      .insert(recipes)
      .values({
        authorId: userId,
        forkedFromId: source.id,
        slug: createUniqueSlug(source.title),
        title: source.title,
        description: source.description,
        coverImageUrl: source.coverImageUrl,
        coverImageKey: null,
        baseServings: source.baseServings,
        prepTimeMin: source.prepTimeMin,
        cookTimeMin: source.cookTimeMin,
        difficulty: source.difficulty,
        visibility: "private",
        status: "active",
        moderationStatus: "unreviewed",
        sourceUrl: source.sourceUrl,
        locale: source.locale,
      })
      .returning();

    if (!forked) {
      throw new HttpError("recipe_fork_failed", 500);
    }

    if (ingredientRows.length > 0) {
      await tx.insert(recipeIngredients).values(
        ingredientRows.map((ing) => ({
          recipeId: forked.id,
          sortOrder: ing.sortOrder,
          groupName: ing.groupName,
          name: ing.name,
          amount: ing.amount,
          unit: ing.unit,
          note: ing.note,
          isScalable: ing.isScalable,
        })),
      );
    }

    if (stepRows.length > 0) {
      await tx.insert(recipeSteps).values(
        stepRows.map((step) => ({
          recipeId: forked.id,
          stepNumber: step.stepNumber,
          instruction: step.instruction,
          timerSeconds: step.timerSeconds,
          imageUrl: step.imageUrl,
          imageKey: null,
        })),
      );
    }

    if (categoryRows.length > 0) {
      await tx.insert(recipeCategories).values(
        categoryRows.map((cat) => ({
          recipeId: forked.id,
          categoryId: cat.categoryId,
        })),
      );
    }

    if (tagRows.length > 0) {
      await tx.insert(recipeTags).values(
        tagRows.map((tag) => ({
          recipeId: forked.id,
          tagId: tag.tagId,
        })),
      );
    }

    return forked;
  });
}

export async function toggleSaveRecipe(userId: string, recipeId: string, shouldSave: boolean) {
  if (!isDatabaseConfigured()) {
    throw new HttpError("service_unavailable", 503);
  }

  const db = getDb();
  if (shouldSave) {
    await db.insert(savedRecipes).values({ userId, recipeId }).onConflictDoNothing();
  } else {
    await db
      .delete(savedRecipes)
      .where(and(eq(savedRecipes.userId, userId), eq(savedRecipes.recipeId, recipeId)));
  }
}

export async function listMyRecipes(
  userId: string,
  tab: "own" | "saved" | "drafts",
): Promise<RecipeCardDto[]> {
  if (!isDatabaseConfigured()) {
    return [];
  }

  const db = getDb();
  const saveCountExpr = sql<number>`coalesce((select count(*)::int from saved_recipes sr where sr.recipe_id = ${recipes.id}), 0)`;

  if (tab === "saved") {
    const savedRows = await db
      .select({
        id: recipes.id,
        slug: recipes.slug,
        title: recipes.title,
        description: recipes.description,
        coverImageUrl: recipes.coverImageUrl,
        baseServings: recipes.baseServings,
        prepTimeMin: recipes.prepTimeMin,
        cookTimeMin: recipes.cookTimeMin,
        difficulty: recipes.difficulty,
        visibility: recipes.visibility,
        status: recipes.status,
        moderationStatus: recipes.moderationStatus,
        moderationNote: recipes.moderationNote,
        locale: recipes.locale,
        authorUsername: users.username,
        authorName: users.name,
        saveCount: saveCountExpr,
        createdAt: recipes.createdAt,
      })
      .from(savedRecipes)
      .innerJoin(recipes, eq(savedRecipes.recipeId, recipes.id))
      .innerJoin(users, eq(recipes.authorId, users.id))
      .where(
        and(
          eq(savedRecipes.userId, userId),
          isNull(recipes.deletedAt),
          ne(recipes.moderationStatus, "hidden"),
        ),
      )
      .orderBy(desc(savedRecipes.savedAt));

    return savedRows.map((row) => ({
      id: row.id,
      slug: row.slug,
      title: row.title,
      description: row.description,
      coverImageUrl: row.coverImageUrl,
      baseServings: row.baseServings,
      prepTimeMin: row.prepTimeMin,
      cookTimeMin: row.cookTimeMin,
      difficulty: row.difficulty as RecipeDifficulty,
      visibility: row.visibility as RecipeVisibility,
      status: row.status as RecipeStatus,
      moderationStatus: row.moderationStatus as ModerationStatus,
      moderationNote: row.moderationNote,
      locale: row.locale as Locale,
      authorUsername: row.authorUsername ?? row.authorName,
      saveCount: Number(row.saveCount),
      createdAt: row.createdAt.toISOString(),
      categories: [],
      tags: [],
    }));
  }

  const statusFilter = tab === "drafts" ? "draft" : "active";
  const rows = await db
    .select({
      id: recipes.id,
      slug: recipes.slug,
      title: recipes.title,
      description: recipes.description,
      coverImageUrl: recipes.coverImageUrl,
      baseServings: recipes.baseServings,
      prepTimeMin: recipes.prepTimeMin,
      cookTimeMin: recipes.cookTimeMin,
      difficulty: recipes.difficulty,
      visibility: recipes.visibility,
      status: recipes.status,
      moderationStatus: recipes.moderationStatus,
      moderationNote: recipes.moderationNote,
      locale: recipes.locale,
      authorUsername: users.username,
      authorName: users.name,
      saveCount: saveCountExpr,
      createdAt: recipes.createdAt,
    })
    .from(recipes)
    .innerJoin(users, eq(recipes.authorId, users.id))
    .where(
      and(
        eq(recipes.authorId, userId),
        eq(recipes.status, statusFilter),
        isNull(recipes.deletedAt),
      ),
    )
    .orderBy(desc(recipes.updatedAt));

  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    coverImageUrl: row.coverImageUrl,
    baseServings: row.baseServings,
    prepTimeMin: row.prepTimeMin,
    cookTimeMin: row.cookTimeMin,
    difficulty: row.difficulty as RecipeDifficulty,
    visibility: row.visibility as RecipeVisibility,
    status: row.status as RecipeStatus,
    moderationStatus: row.moderationStatus as ModerationStatus,
    moderationNote: row.moderationNote,
    locale: row.locale as Locale,
    authorUsername: row.authorUsername ?? row.authorName,
    saveCount: Number(row.saveCount),
    createdAt: row.createdAt.toISOString(),
    categories: [],
    tags: [],
  }));
}

export async function findDuplicateSourceUrl(userId: string, sourceUrl: string) {
  if (!isDatabaseConfigured()) {
    return null;
  }

  const db = getDb();
  const rows = await db
    .select({ id: recipes.id, slug: recipes.slug, title: recipes.title })
    .from(recipes)
    .where(
      and(
        eq(recipes.authorId, userId),
        eq(recipes.sourceUrl, sourceUrl.trim()),
        isNull(recipes.deletedAt),
      ),
    )
    .limit(1);

  return rows[0] ?? null;
}
