import { requireAuth } from "@/core/auth/session";
import { toggleSaveRecipe } from "@/entities/recipe/server/recipe-mutations";
import { forbidden, handleRouteError, ok, verifySameOrigin } from "@/shared/api/http";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    if (!verifySameOrigin(request)) {
      return forbidden("Invalid request origin");
    }
    const { id } = await context.params;
    const user = await requireAuth();
    await toggleSaveRecipe(user.id, id, true);
    return ok({ saved: true });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    if (!verifySameOrigin(request)) {
      return forbidden("Invalid request origin");
    }
    const { id } = await context.params;
    const user = await requireAuth();
    await toggleSaveRecipe(user.id, id, false);
    return ok({ saved: false });
  } catch (error) {
    return handleRouteError(error);
  }
}
