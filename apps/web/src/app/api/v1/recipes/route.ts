import { recipeInputSchema, searchRecipesQuerySchema } from "@recipes/domain";
import { after } from "next/server";
import { requireAuth } from "@/core/auth/session";
import { createRecipe } from "@/entities/recipe/server/recipe-mutations";
import { listPublicRecipes } from "@/entities/recipe/server/recipe-service";
import { sendModerationTelegramNotification } from "@/features/moderation/server/telegram";
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
    if (inserted.visibility === "public" && inserted.status === "active") {
      after(() =>
        sendModerationTelegramNotification({
          title: inserted.title,
          username: user.username,
          slug: inserted.slug,
          locale: inserted.locale,
        }),
      );
    }
    return created(inserted);
  } catch (error) {
    return handleRouteError(error);
  }
}
