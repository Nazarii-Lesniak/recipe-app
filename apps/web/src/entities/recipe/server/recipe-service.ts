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
  type IngredientUnit,
  type Locale,
  type ModerationStatus,
  type RecipeDifficulty,
  type RecipeStatus,
  type RecipeVisibility,
  SEED_CATEGORIES,
  type SearchRecipesQuery,
  type UserRole,
} from "@recipes/domain";
import { and, asc, desc, eq, ilike, inArray, isNull, lte, ne, or, sql } from "drizzle-orm";

export interface CategoryDto {
  id: string;
  slug: string;
  nameUk: string;
  nameEn: string;
  icon: string;
  sortOrder: number;
}

export interface TagDto {
  id: string;
  slug: string;
  name: string;
}

export interface RecipeCardDto {
  id: string;
  slug: string;
  title: string;
  description: string;
  coverImageUrl: string | null;
  baseServings: number;
  prepTimeMin: number;
  cookTimeMin: number;
  difficulty: RecipeDifficulty;
  visibility: RecipeVisibility;
  status: RecipeStatus;
  moderationStatus: ModerationStatus;
  moderationNote: string | null;
  locale: Locale;
  authorUsername: string;
  saveCount: number;
  createdAt: string;
  categories: CategoryDto[];
  tags: TagDto[];
}

export interface RecipeDetailDto extends RecipeCardDto {
  authorId: string;
  coverImageKey: string | null;
  sourceUrl: string | null;
  isSaved: boolean;
  forkedFrom: {
    id: string;
    slug: string;
    title: string;
    authorUsername: string;
  } | null;
  ingredients: Array<{
    id: string;
    sortOrder: number;
    groupName: string | null;
    name: string;
    amount: number | null;
    unit: IngredientUnit;
    note: string | null;
    isScalable: boolean;
  }>;
  steps: Array<{
    id: string;
    stepNumber: number;
    instruction: string;
    timerSeconds: number | null;
    imageUrl: string | null;
    imageKey: string | null;
  }>;
}

export function canViewRecipe(
  recipe: {
    authorId: string;
    visibility: RecipeVisibility;
    status: RecipeStatus;
    moderationStatus: ModerationStatus;
    deletedAt: Date | null;
  },
  viewerId?: string | null,
  viewerRole?: UserRole | null,
): boolean {
  const isAdmin = viewerRole === "admin";
  const isModerator = viewerRole === "moderator" || isAdmin;
  const isAuthor = Boolean(viewerId && recipe.authorId === viewerId);

  if (recipe.deletedAt !== null) {
    return isAdmin;
  }
  if (recipe.status === "draft" || recipe.visibility === "private") {
    return isAuthor || isAdmin;
  }
  if (recipe.moderationStatus === "hidden") {
    return isAuthor || isModerator;
  }
  return true;
}

function fallbackCategories(): CategoryDto[] {
  return SEED_CATEGORIES.map((c) => ({
    id: c.slug,
    slug: c.slug,
    nameUk: c.nameUk,
    nameEn: c.nameEn,
    icon: c.icon,
    sortOrder: c.sortOrder,
  }));
}

export async function listCategories(): Promise<CategoryDto[]> {
  if (!isDatabaseConfigured()) {
    return fallbackCategories();
  }

  try {
    const db = getDb();
    const rows = await db.select().from(categories).orderBy(asc(categories.sortOrder));
    if (rows.length === 0) {
      return fallbackCategories();
    }
    return rows;
  } catch {
    return fallbackCategories();
  }
}

export async function searchTags(query?: string): Promise<TagDto[]> {
  if (!isDatabaseConfigured()) {
    return [];
  }

  try {
    const db = getDb();
    const trimmed = query?.trim();
    const rows = trimmed
      ? await db
          .select()
          .from(tags)
          .where(ilike(tags.name, `%${trimmed}%`))
          .orderBy(asc(tags.name))
          .limit(20)
      : await db.select().from(tags).orderBy(asc(tags.name)).limit(20);
    return rows;
  } catch {
    return [];
  }
}

async function hydrateRecipeCards(
  baseRows: Array<{
    id: string;
    slug: string;
    title: string;
    description: string;
    coverImageUrl: string | null;
    baseServings: number;
    prepTimeMin: number;
    cookTimeMin: number;
    difficulty: RecipeDifficulty;
    visibility: RecipeVisibility;
    status: RecipeStatus;
    moderationStatus: ModerationStatus;
    moderationNote: string | null;
    locale: Locale;
    authorUsername: string | null;
    authorName: string;
    saveCount: number;
    createdAt: Date;
  }>,
): Promise<RecipeCardDto[]> {
  if (baseRows.length === 0) {
    return [];
  }

  const db = getDb();
  const ids = baseRows.map((r) => r.id);

  const [catLinks, tagLinks] = await Promise.all([
    db
      .select({
        recipeId: recipeCategories.recipeId,
        category: categories,
      })
      .from(recipeCategories)
      .innerJoin(categories, eq(recipeCategories.categoryId, categories.id))
      .where(inArray(recipeCategories.recipeId, ids)),
    db
      .select({
        recipeId: recipeTags.recipeId,
        tag: tags,
      })
      .from(recipeTags)
      .innerJoin(tags, eq(recipeTags.tagId, tags.id))
      .where(inArray(recipeTags.recipeId, ids)),
  ]);

  const catsByRecipe = new Map<string, CategoryDto[]>();
  for (const link of catLinks) {
    const list = catsByRecipe.get(link.recipeId) ?? [];
    list.push(link.category);
    catsByRecipe.set(link.recipeId, list);
  }

  const tagsByRecipe = new Map<string, TagDto[]>();
  for (const link of tagLinks) {
    const list = tagsByRecipe.get(link.recipeId) ?? [];
    list.push(link.tag);
    tagsByRecipe.set(link.recipeId, list);
  }

  return baseRows.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    coverImageUrl: row.coverImageUrl,
    baseServings: row.baseServings,
    prepTimeMin: row.prepTimeMin,
    cookTimeMin: row.cookTimeMin,
    difficulty: row.difficulty,
    visibility: row.visibility,
    status: row.status,
    moderationStatus: row.moderationStatus,
    moderationNote: row.moderationNote,
    locale: row.locale,
    authorUsername: row.authorUsername ?? row.authorName,
    saveCount: Number(row.saveCount),
    createdAt: row.createdAt.toISOString(),
    categories: catsByRecipe.get(row.id) ?? [],
    tags: tagsByRecipe.get(row.id) ?? [],
  }));
}

export async function listPublicRecipes(query: SearchRecipesQuery): Promise<{
  items: RecipeCardDto[];
  total: number;
  page: number;
  limit: number;
}> {
  if (!isDatabaseConfigured()) {
    return { items: [], total: 0, page: query.page, limit: query.limit };
  }

  try {
    const db = getDb();
    const conditions = [
      isNull(recipes.deletedAt),
      eq(recipes.visibility, "public"),
      eq(recipes.status, "active"),
      ne(recipes.moderationStatus, "hidden"),
    ];

    if (query.locale !== "all") {
      conditions.push(eq(recipes.locale, query.locale));
    }

    if (query.difficulty !== "all") {
      conditions.push(eq(recipes.difficulty, query.difficulty));
    }

    if (query.maxTime !== undefined) {
      conditions.push(lte(sql`(${recipes.prepTimeMin} + ${recipes.cookTimeMin})`, query.maxTime));
    }

    if (query.category) {
      const catSubquery = db
        .select({ recipeId: recipeCategories.recipeId })
        .from(recipeCategories)
        .innerJoin(categories, eq(recipeCategories.categoryId, categories.id))
        .where(eq(categories.slug, query.category));
      conditions.push(inArray(recipes.id, catSubquery));
    }

    if (query.tag) {
      const tagSubquery = db
        .select({ recipeId: recipeTags.recipeId })
        .from(recipeTags)
        .innerJoin(tags, eq(recipeTags.tagId, tags.id))
        .where(eq(tags.slug, query.tag));
      conditions.push(inArray(recipes.id, tagSubquery));
    }

    const qTrimmed = query.q?.trim();
    if (qTrimmed) {
      const likePattern = `%${qTrimmed}%`;
      const ingredientMatchSubquery = db
        .select({ recipeId: recipeIngredients.recipeId })
        .from(recipeIngredients)
        .where(
          or(
            ilike(recipeIngredients.name, likePattern),
            sql`similarity(${recipeIngredients.name}, ${qTrimmed}) > 0.25`,
          ),
        );

      const textCondition = or(
        ilike(recipes.title, likePattern),
        ilike(recipes.description, likePattern),
        sql`similarity(${recipes.title}, ${qTrimmed}) > 0.2`,
        sql`similarity(${recipes.description}, ${qTrimmed}) > 0.15`,
        inArray(recipes.id, ingredientMatchSubquery),
      );
      if (textCondition) {
        conditions.push(textCondition);
      }
    }

    const whereClause = and(...conditions);

    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(recipes)
      .where(whereClause);
    const total = countResult[0]?.count ?? 0;

    const saveCountExpr = sql<number>`coalesce((select count(*)::int from saved_recipes sr where sr.recipe_id = ${recipes.id}), 0)`;

    const orderByClause =
      query.sort === "popular"
        ? [desc(saveCountExpr), desc(recipes.createdAt)]
        : qTrimmed
          ? [desc(sql`similarity(${recipes.title}, ${qTrimmed})`), desc(recipes.createdAt)]
          : [desc(recipes.createdAt)];

    const offset = (query.page - 1) * query.limit;

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
      .where(whereClause)
      .orderBy(...orderByClause)
      .limit(query.limit)
      .offset(offset);

    const items = await hydrateRecipeCards(rows);
    return { items, total, page: query.page, limit: query.limit };
  } catch {
    return { items: [], total: 0, page: query.page, limit: query.limit };
  }
}

export async function getRecipeBySlug(
  slug: string,
  viewerId?: string | null,
  viewerRole?: UserRole | null,
): Promise<RecipeDetailDto | null> {
  if (!isDatabaseConfigured()) {
    return null;
  }

  try {
    const db = getDb();
    const rows = await db
      .select({
        id: recipes.id,
        authorId: recipes.authorId,
        forkedFromId: recipes.forkedFromId,
        slug: recipes.slug,
        title: recipes.title,
        description: recipes.description,
        coverImageUrl: recipes.coverImageUrl,
        coverImageKey: recipes.coverImageKey,
        baseServings: recipes.baseServings,
        prepTimeMin: recipes.prepTimeMin,
        cookTimeMin: recipes.cookTimeMin,
        difficulty: recipes.difficulty,
        visibility: recipes.visibility,
        status: recipes.status,
        moderationStatus: recipes.moderationStatus,
        moderationNote: recipes.moderationNote,
        sourceUrl: recipes.sourceUrl,
        locale: recipes.locale,
        deletedAt: recipes.deletedAt,
        createdAt: recipes.createdAt,
        authorUsername: users.username,
        authorName: users.name,
      })
      .from(recipes)
      .innerJoin(users, eq(recipes.authorId, users.id))
      .where(eq(recipes.slug, slug))
      .limit(1);

    const row = rows[0];
    if (!row || !canViewRecipe(row, viewerId, viewerRole)) {
      return null;
    }

    const [
      ingredientRows,
      stepRows,
      catLinks,
      tagLinks,
      saveCountRows,
      savedByViewerRows,
      forkOriginRows,
    ] = await Promise.all([
      db
        .select()
        .from(recipeIngredients)
        .where(eq(recipeIngredients.recipeId, row.id))
        .orderBy(asc(recipeIngredients.sortOrder)),
      db
        .select()
        .from(recipeSteps)
        .where(eq(recipeSteps.recipeId, row.id))
        .orderBy(asc(recipeSteps.stepNumber)),
      db
        .select({ category: categories })
        .from(recipeCategories)
        .innerJoin(categories, eq(recipeCategories.categoryId, categories.id))
        .where(eq(recipeCategories.recipeId, row.id)),
      db
        .select({ tag: tags })
        .from(recipeTags)
        .innerJoin(tags, eq(recipeTags.tagId, tags.id))
        .where(eq(recipeTags.recipeId, row.id)),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(savedRecipes)
        .where(eq(savedRecipes.recipeId, row.id)),
      viewerId
        ? db
            .select({ recipeId: savedRecipes.recipeId })
            .from(savedRecipes)
            .where(and(eq(savedRecipes.recipeId, row.id), eq(savedRecipes.userId, viewerId)))
            .limit(1)
        : Promise.resolve([]),
      row.forkedFromId
        ? db
            .select({
              id: recipes.id,
              slug: recipes.slug,
              title: recipes.title,
              authorUsername: users.username,
              authorName: users.name,
            })
            .from(recipes)
            .innerJoin(users, eq(recipes.authorId, users.id))
            .where(eq(recipes.id, row.forkedFromId))
            .limit(1)
        : Promise.resolve([]),
    ]);

    const forkOrigin = forkOriginRows[0];

    return {
      id: row.id,
      authorId: row.authorId,
      slug: row.slug,
      title: row.title,
      description: row.description,
      coverImageUrl: row.coverImageUrl,
      coverImageKey: row.coverImageKey,
      baseServings: row.baseServings,
      prepTimeMin: row.prepTimeMin,
      cookTimeMin: row.cookTimeMin,
      difficulty: row.difficulty,
      visibility: row.visibility,
      status: row.status,
      moderationStatus: row.moderationStatus,
      moderationNote: row.moderationNote,
      sourceUrl: row.sourceUrl,
      locale: row.locale,
      authorUsername: row.authorUsername ?? row.authorName,
      saveCount: saveCountRows[0]?.count ?? 0,
      isSaved: savedByViewerRows.length > 0,
      createdAt: row.createdAt.toISOString(),
      categories: catLinks.map((c) => c.category),
      tags: tagLinks.map((t) => t.tag),
      forkedFrom: forkOrigin
        ? {
            id: forkOrigin.id,
            slug: forkOrigin.slug,
            title: forkOrigin.title,
            authorUsername: forkOrigin.authorUsername ?? forkOrigin.authorName,
          }
        : null,
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
  } catch {
    return null;
  }
}

export async function listPublishedSlugsForSitemap(): Promise<
  Array<{ slug: string; updatedAt: Date }>
> {
  if (!isDatabaseConfigured()) {
    return [];
  }

  try {
    const db = getDb();
    return await db
      .select({ slug: recipes.slug, updatedAt: recipes.updatedAt })
      .from(recipes)
      .where(
        and(
          isNull(recipes.deletedAt),
          eq(recipes.visibility, "public"),
          eq(recipes.status, "active"),
          ne(recipes.moderationStatus, "hidden"),
        ),
      )
      .orderBy(desc(recipes.updatedAt))
      .limit(500);
  } catch {
    return [];
  }
}
