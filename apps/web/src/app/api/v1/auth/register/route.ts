import { getDb, isDatabaseConfigured } from "@recipes/db";
import { users } from "@recipes/db/schema";
import { buildInternalEmail, normalizeUsername, registerSchema } from "@recipes/domain";
import { eq, sql } from "drizzle-orm";
import { auth } from "@/core/auth/auth";
import {
  badRequest,
  forbidden,
  getClientIp,
  handleRouteError,
  ok,
  tooManyRequests,
  verifySameOrigin,
} from "@/shared/api/http";
import { checkRateLimit } from "@/shared/api/rate-limit";

export async function POST(request: Request) {
  try {
    if (!verifySameOrigin(request)) {
      return forbidden("Invalid request origin");
    }

    const rate = await checkRateLimit("auth-register", getClientIp(request), 10, 60);
    if (!rate.allowed) {
      return tooManyRequests(rate.resetAt);
    }

    if (!isDatabaseConfigured()) {
      return badRequest("Database is not configured");
    }

    const body: unknown = await request.json();
    const parsed = registerSchema.parse(body);
    const normalized = normalizeUsername(parsed.username);

    const db = getDb();
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(sql`lower(${users.username})`, normalized))
      .limit(1);

    if (existing.length > 0) {
      return badRequest("username_taken");
    }

    const authResponse = await auth.api.signUpEmail({
      body: {
        email: buildInternalEmail(normalized),
        name: parsed.username.trim(),
        username: normalized,
        displayUsername: parsed.username.trim(),
        password: parsed.password,
      },
      asResponse: true,
    });

    const data: unknown = await authResponse.json();
    const response = ok(data, authResponse.status);

    const setCookie = authResponse.headers.get("set-cookie");
    if (setCookie) {
      response.headers.set("set-cookie", setCookie);
    }

    return response;
  } catch (error) {
    return handleRouteError(error);
  }
}
