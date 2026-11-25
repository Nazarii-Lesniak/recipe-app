import { searchRecipesQuerySchema } from "@recipes/domain";
import { listPublicRecipes } from "@/entities/recipe/server/recipe-service";
import { handleRouteError, ok } from "@/shared/api/http";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const rawParams = Object.fromEntries(url.searchParams.entries());
    const query = searchRecipesQuerySchema.parse(rawParams);
    const data = await listPublicRecipes(query);
    return ok(data);
  } catch (error) {
    return handleRouteError(error);
  }
}
