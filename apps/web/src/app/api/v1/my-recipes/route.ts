import { requireAuth } from "@/core/auth/session";
import { listMyRecipes } from "@/entities/recipe/server/recipe-mutations";
import { handleRouteError, ok } from "@/shared/api/http";

export async function GET(request: Request) {
  try {
    const user = await requireAuth();
    const url = new URL(request.url);
    const rawTab = url.searchParams.get("tab");
    const tab = rawTab === "saved" || rawTab === "drafts" ? rawTab : "own";
    const items = await listMyRecipes(user.id, tab);
    return ok({ items });
  } catch (error) {
    return handleRouteError(error);
  }
}
