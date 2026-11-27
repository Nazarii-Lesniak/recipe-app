import { requireAuth } from "@/core/auth/session";
import { findDuplicateSourceUrl } from "@/entities/recipe/server/recipe-mutations";
import { badRequest, handleRouteError, ok } from "@/shared/api/http";

export async function GET(request: Request) {
  try {
    const user = await requireAuth();
    const url = new URL(request.url);
    const sourceUrl = url.searchParams.get("sourceUrl");
    if (!sourceUrl) {
      return badRequest("validation_failed");
    }
    const existing = await findDuplicateSourceUrl(user.id, sourceUrl);
    return ok({ duplicate: existing });
  } catch (error) {
    return handleRouteError(error);
  }
}
