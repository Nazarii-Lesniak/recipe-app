import { requireRole } from "@/core/auth/session";
import { getModerationQueue } from "@/features/moderation/server/moderation-service";
import { handleRouteError, ok } from "@/shared/api/http";

export async function GET() {
  try {
    await requireRole(["moderator", "admin"]);
    const items = await getModerationQueue();
    return ok({ items });
  } catch (error) {
    return handleRouteError(error);
  }
}
