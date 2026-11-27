import { getDb, isDatabaseConfigured } from "@recipes/db";
import { savedRecipes } from "@recipes/db/schema";
import { eq } from "drizzle-orm";
import { getServerSession } from "@/core/auth/session";
import { handleRouteError, ok } from "@/shared/api/http";

export async function GET() {
  try {
    if (!isDatabaseConfigured()) {
      return ok({ ids: [] });
    }
    const session = await getServerSession();
    if (!session) {
      return ok({ ids: [] });
    }
    const db = getDb();
    const rows = await db
      .select({ recipeId: savedRecipes.recipeId })
      .from(savedRecipes)
      .where(eq(savedRecipes.userId, session.user.id));

    return ok({ ids: rows.map((row) => row.recipeId) });
  } catch (error) {
    return handleRouteError(error);
  }
}
