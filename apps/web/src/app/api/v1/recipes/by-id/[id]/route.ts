import { recipeInputSchema } from "@recipes/domain";
import { after } from "next/server";
import { requireAuth } from "@/core/auth/session";
import {
  getRecipeByIdForEdit,
  softDeleteRecipe,
  updateRecipe,
} from "@/entities/recipe/server/recipe-mutations";
import { sendModerationTelegramNotification } from "@/features/moderation/server/telegram";
import { forbidden, handleRouteError, notFound, ok, verifySameOrigin } from "@/shared/api/http";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const user = await requireAuth();
    const recipe = await getRecipeByIdForEdit(id, user.id, user.role);
    if (!recipe) {
      return notFound("not_found");
    }
    return ok(recipe);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    if (!verifySameOrigin(request)) {
      return forbidden("forbidden");
    }
    const { id } = await context.params;
    const user = await requireAuth();
    const body: unknown = await request.json();
    const parsed = recipeInputSchema.parse(body);
    const updated = await updateRecipe(user.id, user.role, id, parsed);
    if (updated.visibility === "public" && updated.status === "active") {
      after(() =>
        sendModerationTelegramNotification({
          title: updated.title,
          username: user.username,
          slug: updated.slug,
          locale: updated.locale,
        }),
      );
    }
    return ok(updated);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    if (!verifySameOrigin(request)) {
      return forbidden("forbidden");
    }
    const { id } = await context.params;
    const user = await requireAuth();
    const result = await softDeleteRecipe(user.id, user.role, id);
    return ok(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
