import { aiImportRequestSchema } from "@recipes/domain";
import { requireAuth } from "@/core/auth/session";
import { importRecipeFromSource } from "@/features/ai-import/server/ai-import-service";
import {
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

    const user = await requireAuth();
    const rate = await checkRateLimit("ai-import", `${user.id}:${getClientIp(request)}`, 10, 60);
    if (!rate.allowed) {
      return tooManyRequests(rate.resetAt);
    }

    const body: unknown = await request.json();
    const parsed = aiImportRequestSchema.parse(body);
    const result = await importRecipeFromSource(user.id, parsed);
    return ok(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
