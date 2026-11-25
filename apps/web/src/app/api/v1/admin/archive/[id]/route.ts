import { requireRole } from "@/core/auth/session";
import { hardDeleteRecipe } from "@/features/moderation/server/moderation-service";
import { forbidden, handleRouteError, ok, verifySameOrigin } from "@/shared/api/http";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    if (!verifySameOrigin(request)) {
      return forbidden("Invalid request origin");
    }
    const admin = await requireRole(["admin"]);
    const { id } = await context.params;
    await hardDeleteRecipe(admin.id, id);
    return ok({ deleted: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
