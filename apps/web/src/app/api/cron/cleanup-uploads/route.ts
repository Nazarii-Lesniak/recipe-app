import { getDb, isDatabaseConfigured } from "@recipes/db";
import { recipeSteps, recipes } from "@recipes/db/schema";
import { isNotNull } from "drizzle-orm";
import { env } from "@/core/env";
import { ok, unauthorized } from "@/shared/api/http";
import { deleteUploadThingFiles, getUtApi } from "@/shared/api/uploadthing";

export async function GET(request: Request) {
  if (env.CRON_SECRET) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
      return unauthorized("Invalid cron secret");
    }
  }

  const utapi = getUtApi();
  if (!utapi || !isDatabaseConfigured()) {
    return ok({ skipped: true, deletedCount: 0 });
  }

  const db = getDb();
  const [coverRows, stepRows, listed] = await Promise.all([
    db.select({ key: recipes.coverImageKey }).from(recipes).where(isNotNull(recipes.coverImageKey)),
    db
      .select({ key: recipeSteps.imageKey })
      .from(recipeSteps)
      .where(isNotNull(recipeSteps.imageKey)),
    utapi.listFiles({ limit: 500 }),
  ]);

  const activeKeys = new Set<string>();
  for (const row of coverRows) {
    if (row.key) activeKeys.add(row.key);
  }
  for (const row of stepRows) {
    if (row.key) activeKeys.add(row.key);
  }

  const cutoffMs = Date.now() - 24 * 60 * 60 * 1000;
  const orphanKeys = listed.files
    .filter((file) => !activeKeys.has(file.key) && file.uploadedAt < cutoffMs)
    .map((file) => file.key);

  if (orphanKeys.length > 0) {
    await deleteUploadThingFiles(orphanKeys);
  }

  return ok({ skipped: false, deletedCount: orphanKeys.length });
}
