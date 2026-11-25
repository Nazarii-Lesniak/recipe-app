import { getDb, isDatabaseConfigured } from "@recipes/db";
import { moderationLogs, recipeSteps, recipes, users } from "@recipes/db/schema";
import type { ModerationActionInput } from "@recipes/domain";
import { and, desc, eq, isNotNull, isNull } from "drizzle-orm";
import { HttpError } from "@/shared/api/http";
import { deleteUploadThingFiles } from "@/shared/api/uploadthing";

export interface ModerationQueueItem {
  id: string;
  slug: string;
  title: string;
  description: string;
  locale: string;
  authorUsername: string;
  createdAt: string;
  deletedAt: string | null;
}

export async function getModerationQueue(): Promise<ModerationQueueItem[]> {
  if (!isDatabaseConfigured()) {
    return [];
  }

  try {
    const db = getDb();
    const rows = await db
      .select({
        id: recipes.id,
        slug: recipes.slug,
        title: recipes.title,
        description: recipes.description,
        locale: recipes.locale,
        authorUsername: users.username,
        authorName: users.name,
        createdAt: recipes.createdAt,
        deletedAt: recipes.deletedAt,
      })
      .from(recipes)
      .innerJoin(users, eq(recipes.authorId, users.id))
      .where(
        and(
          isNull(recipes.deletedAt),
          eq(recipes.visibility, "public"),
          eq(recipes.status, "active"),
          eq(recipes.moderationStatus, "unreviewed"),
        ),
      )
      .orderBy(desc(recipes.createdAt))
      .limit(100);

    return rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      title: row.title,
      description: row.description,
      locale: row.locale,
      authorUsername: row.authorUsername ?? row.authorName,
      createdAt: row.createdAt.toISOString(),
      deletedAt: row.deletedAt ? row.deletedAt.toISOString() : null,
    }));
  } catch {
    return [];
  }
}

export async function reviewRecipe(
  moderatorId: string,
  recipeId: string,
  input: ModerationActionInput,
): Promise<void> {
  if (!isDatabaseConfigured()) {
    throw new HttpError("Database is not configured", 503);
  }

  const db = getDb();
  await db.transaction(async (tx) => {
    const existing = await tx
      .select({ id: recipes.id })
      .from(recipes)
      .where(and(eq(recipes.id, recipeId), isNull(recipes.deletedAt)))
      .limit(1);

    if (existing.length === 0) {
      throw new HttpError("Recipe not found", 404);
    }

    await tx
      .update(recipes)
      .set({
        moderationStatus: input.action,
        moderationNote: input.action === "hidden" ? (input.reason ?? null) : null,
      })
      .where(eq(recipes.id, recipeId));

    await tx.insert(moderationLogs).values({
      recipeId,
      moderatorId,
      action: input.action,
      reason: input.reason ?? null,
    });
  });
}

export async function listDeletedArchive(): Promise<ModerationQueueItem[]> {
  if (!isDatabaseConfigured()) {
    return [];
  }

  try {
    const db = getDb();
    const rows = await db
      .select({
        id: recipes.id,
        slug: recipes.slug,
        title: recipes.title,
        description: recipes.description,
        locale: recipes.locale,
        authorUsername: users.username,
        authorName: users.name,
        createdAt: recipes.createdAt,
        deletedAt: recipes.deletedAt,
      })
      .from(recipes)
      .innerJoin(users, eq(recipes.authorId, users.id))
      .where(isNotNull(recipes.deletedAt))
      .orderBy(desc(recipes.deletedAt))
      .limit(100);

    return rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      title: row.title,
      description: row.description,
      locale: row.locale,
      authorUsername: row.authorUsername ?? row.authorName,
      createdAt: row.createdAt.toISOString(),
      deletedAt: row.deletedAt ? row.deletedAt.toISOString() : null,
    }));
  } catch {
    return [];
  }
}

export async function adminRestoreRecipe(adminId: string, recipeId: string): Promise<void> {
  if (!isDatabaseConfigured()) {
    throw new HttpError("Database is not configured", 503);
  }

  const db = getDb();
  await db.transaction(async (tx) => {
    const existing = await tx
      .select({ id: recipes.id })
      .from(recipes)
      .where(eq(recipes.id, recipeId))
      .limit(1);

    if (existing.length === 0) {
      throw new HttpError("Recipe not found", 404);
    }

    await tx.update(recipes).set({ deletedAt: null }).where(eq(recipes.id, recipeId));

    await tx.insert(moderationLogs).values({
      recipeId,
      moderatorId: adminId,
      action: "restored",
      reason: null,
    });
  });
}

export async function hardDeleteRecipe(adminId: string, recipeId: string): Promise<void> {
  if (!isDatabaseConfigured()) {
    throw new HttpError("Database is not configured", 503);
  }

  const db = getDb();
  const keysToDelete: Array<string | null> = [];

  await db.transaction(async (tx) => {
    const [target] = await tx
      .select({
        id: recipes.id,
        title: recipes.title,
        coverImageKey: recipes.coverImageKey,
      })
      .from(recipes)
      .where(eq(recipes.id, recipeId))
      .limit(1);

    if (!target) {
      throw new HttpError("Recipe not found", 404);
    }

    const steps = await tx
      .select({ imageKey: recipeSteps.imageKey })
      .from(recipeSteps)
      .where(eq(recipeSteps.recipeId, recipeId));

    keysToDelete.push(target.coverImageKey, ...steps.map((s) => s.imageKey));

    await tx.insert(moderationLogs).values({
      recipeId: null,
      moderatorId: adminId,
      action: "hard_deleted",
      reason: `Hard deleted recipe: ${target.title}`,
    });

    await tx.delete(recipes).where(eq(recipes.id, recipeId));
  });

  await deleteUploadThingFiles(keysToDelete);
}
