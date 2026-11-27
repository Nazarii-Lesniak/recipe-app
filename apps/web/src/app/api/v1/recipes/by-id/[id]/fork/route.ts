import { requireAuth } from "@/core/auth/session";
import { forkRecipe } from "@/entities/recipe/server/recipe-mutations";
import { created, forbidden, handleRouteError, verifySameOrigin } from "@/shared/api/http";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    if (!verifySameOrigin(request)) {
      return forbidden("forbidden");
    }
    const { id } = await context.params;
    const user = await requireAuth();
    const forked = await forkRecipe(user.id, id);
    return created(forked);
  } catch (error) {
    return handleRouteError(error);
  }
}
