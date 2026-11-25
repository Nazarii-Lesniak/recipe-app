import { listCategories } from "@/entities/recipe/server/recipe-service";
import { handleRouteError, ok } from "@/shared/api/http";

export async function GET() {
  try {
    const items = await listCategories();
    return ok({ items });
  } catch (error) {
    return handleRouteError(error);
  }
}
