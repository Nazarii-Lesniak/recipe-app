"use client";

import type { RecipeInput } from "@recipes/domain";
import { useTranslations } from "next-intl";
import type { CategoryDto, RecipeDetailDto } from "@/entities/recipe/server/recipe-service";
import { RecipeForm } from "@/features/recipe-form/ui/recipe-form";

export function EditRecipeView({
  categories,
  recipe,
}: {
  categories: CategoryDto[];
  recipe: RecipeDetailDto;
}) {
  const t = useTranslations("editor");
  const tRecipe = useTranslations("recipe");

  const initialValues: Partial<RecipeInput> = {
    title: recipe.title,
    description: recipe.description,
    coverImageUrl: recipe.coverImageUrl,
    coverImageKey: recipe.coverImageKey,
    baseServings: recipe.baseServings,
    prepTimeMin: recipe.prepTimeMin,
    cookTimeMin: recipe.cookTimeMin,
    difficulty: recipe.difficulty,
    visibility: recipe.visibility,
    status: recipe.status,
    sourceUrl: recipe.sourceUrl,
    locale: recipe.locale,
    categorySlugs: recipe.categories.map((c) => c.slug),
    tags: recipe.tags.map((tItem) => tItem.name),
    ingredients: recipe.ingredients.map((ing) => ({
      groupName: ing.groupName,
      name: ing.name,
      amount: ing.amount,
      unit: ing.unit,
      note: ing.note,
      isScalable: ing.isScalable,
    })),
    steps: recipe.steps.map((step) => ({
      instruction: step.instruction,
      timerSeconds: step.timerSeconds,
      imageUrl: step.imageUrl,
      imageKey: step.imageKey,
    })),
  };

  return (
    <main className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8">
      <h1 className="font-editorial text-3xl font-bold">{t("editTitle")}</h1>

      {recipe.moderationStatus === "hidden" && recipe.moderationNote ? (
        <div
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          <strong>{tRecipe("hiddenBadge")}:</strong>{" "}
          {tRecipe("hiddenReason", { reason: recipe.moderationNote })}
        </div>
      ) : null}

      <RecipeForm
        categories={categories}
        initialValues={initialValues}
        recipeId={recipe.id}
        scopeKey={`edit_${recipe.id}`}
      />
    </main>
  );
}
