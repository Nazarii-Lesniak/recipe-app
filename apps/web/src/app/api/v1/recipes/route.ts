import { recipeInputSchema, searchRecipesQuerySchema } from "@recipes/domain";
import { requireAuth } from "@/core/auth/session";
import { createRecipe } from "@/entities/recipe/server/recipe-mutations";
import { listPublicRecipes } from "@/entities/recipe/server/recipe-service";
import { created, forbidden, handleRouteError, ok, verifySameOrigin } from "@/shared/api/http";

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

export async function POST(request: Request) {
  try {
    if (!verifySameOrigin(request)) {
      return forbidden("Invalid request origin");
    }
    const user = await requireAuth();
    const body: unknown = await request.json();
    const parsed = recipeInputSchema.parse(body);
    const inserted = await createRecipe(user.id, parsed);
    return created(inserted);
  } catch (error) {
    return handleRouteError(error);
  }
}
