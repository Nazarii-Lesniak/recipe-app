import { searchTags } from "@/entities/recipe/server/recipe-service";
import { handleRouteError, ok } from "@/shared/api/http";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const q = url.searchParams.get("q") ?? undefined;
    const items = await searchTags(q);
    return ok({ items });
  } catch (error) {
    return handleRouteError(error);
  }
}
