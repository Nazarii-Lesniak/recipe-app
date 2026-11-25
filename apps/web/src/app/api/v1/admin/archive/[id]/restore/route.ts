import { requireRole } from "@/core/auth/session";
import { adminRestoreRecipe } from "@/features/moderation/server/moderation-service";
import { forbidden, handleRouteError, ok, verifySameOrigin } from "@/shared/api/http";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    if (!verifySameOrigin(request)) {
      return forbidden("Invalid request origin");
    }
    const admin = await requireRole(["admin"]);
    const { id } = await context.params;
    await adminRestoreRecipe(admin.id, id);
    return ok({ restored: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
