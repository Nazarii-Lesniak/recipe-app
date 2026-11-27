import { requireAuth } from "@/core/auth/session";
import { restoreRecipe } from "@/entities/recipe/server/recipe-mutations";
import { forbidden, handleRouteError, ok, verifySameOrigin } from "@/shared/api/http";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    if (!verifySameOrigin(request)) {
      return forbidden("forbidden");
    }
    const { id } = await context.params;
    const user = await requireAuth();
    const result = await restoreRecipe(user.id, user.role, id);
    return ok(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
