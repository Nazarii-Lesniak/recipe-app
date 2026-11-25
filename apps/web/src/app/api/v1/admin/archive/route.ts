import { requireRole } from "@/core/auth/session";
import { listDeletedArchive } from "@/features/moderation/server/moderation-service";
import { handleRouteError, ok } from "@/shared/api/http";

export async function GET() {
  try {
    await requireRole(["admin"]);
    const items = await listDeletedArchive();
    return ok({ items });
  } catch (error) {
    return handleRouteError(error);
  }
}
