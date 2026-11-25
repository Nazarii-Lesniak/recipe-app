import { getServerSession } from "@/core/auth/session";
import { getRecipeBySlug } from "@/entities/recipe/server/recipe-service";
import { handleRouteError, notFound, ok } from "@/shared/api/http";

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await context.params;
    const session = await getServerSession();
    const recipe = await getRecipeBySlug(slug, session?.user.id, session?.user.role);
    if (!recipe) {
      return notFound("Recipe not found");
    }
    return ok(recipe);
  } catch (error) {
    return handleRouteError(error);
  }
}
