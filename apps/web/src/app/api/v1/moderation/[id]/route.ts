import { moderationActionSchema } from "@recipes/domain";
import { requireRole } from "@/core/auth/session";
import { reviewRecipe } from "@/features/moderation/server/moderation-service";
import { forbidden, handleRouteError, ok, verifySameOrigin } from "@/shared/api/http";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    if (!verifySameOrigin(request)) {
      return forbidden("forbidden");
    }
    const moderator = await requireRole(["moderator", "admin"]);
    const { id } = await context.params;
    const body: unknown = await request.json();
    const parsed = moderationActionSchema.parse(body);
    await reviewRecipe(moderator.id, id, parsed);
    return ok({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
