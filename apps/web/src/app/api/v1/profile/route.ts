import { getDb, isDatabaseConfigured } from "@recipes/db";
import { users } from "@recipes/db/schema";
import { normalizeUsername, profileUpdateSchema } from "@recipes/domain";
import { and, eq, ne, sql } from "drizzle-orm";
import { requireAuth } from "@/core/auth/session";
import { badRequest, forbidden, handleRouteError, ok, verifySameOrigin } from "@/shared/api/http";

export async function GET() {
  try {
    const user = await requireAuth();
    return ok({ user });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    if (!verifySameOrigin(request)) {
      return forbidden("Invalid request origin");
    }
    if (!isDatabaseConfigured()) {
      return badRequest("Database is not configured");
    }

    const user = await requireAuth();
    const body: unknown = await request.json();
    const parsed = profileUpdateSchema.parse(body);
    const db = getDb();

    const updates: Partial<typeof users.$inferInsert> = {};

    if (parsed.username !== undefined) {
      const normalized = normalizeUsername(parsed.username);
      const conflict = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(sql`lower(${users.username})`, normalized), ne(users.id, user.id)))
        .limit(1);

      if (conflict.length > 0) {
        return badRequest("username_taken");
      }

      updates.username = normalized;
      updates.displayUsername = parsed.username.trim();
    }

    if (parsed.displayName !== undefined) updates.displayName = parsed.displayName;
    if (parsed.preferredLocale !== undefined) updates.preferredLocale = parsed.preferredLocale;
    if (parsed.preferredTheme !== undefined) updates.preferredTheme = parsed.preferredTheme;
    if (parsed.preferredUnits !== undefined) updates.preferredUnits = parsed.preferredUnits;

    if (Object.keys(updates).length > 0) {
      await db.update(users).set(updates).where(eq(users.id, user.id));
    }

    const updated = await db
      .select({
        id: users.id,
        name: users.name,
        username: users.username,
        displayName: users.displayName,
        role: users.role,
        preferredLocale: users.preferredLocale,
        preferredTheme: users.preferredTheme,
        preferredUnits: users.preferredUnits,
      })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    return ok({ user: updated[0] ?? user });
  } catch (error) {
    return handleRouteError(error);
  }
}
