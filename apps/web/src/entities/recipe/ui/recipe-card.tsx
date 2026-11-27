"use client";

import { Bookmark, ChefHat, Clock, Pencil, Trash2, Utensils } from "lucide-react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Link } from "@/core/i18n/navigation";
import type { RecipeCardDto } from "@/entities/recipe/server/recipe-service";
import {
  useSavedRecipeIds,
  useToggleSaveRecipe,
} from "@/features/save-recipe/model/use-saved-recipes";
import { cn } from "@/shared/lib/cn";
import { Badge, Button, Card, CardContent } from "@/shared/ui";

export function RecipeCard({
  recipe,
  showSaveButton = recipe.status !== "draft",
  showStatusBadges = false,
  editHref,
  onDelete,
}: {
  recipe: RecipeCardDto;
  showSaveButton?: boolean;
  showStatusBadges?: boolean;
  editHref?: string;
  onDelete?: () => void;
}) {
  const tDiff = useTranslations("difficulty");
  const tCommon = useTranslations("common");
  const tRecipe = useTranslations("recipe");
  const locale = useLocale();
  const totalMinutes = recipe.prepTimeMin + recipe.cookTimeMin;
  const { savedIds } = useSavedRecipeIds();
  const { toggleSave } = useToggleSaveRecipe();
  const [savedDelta, setSavedDelta] = useState(0);

  const isSaved = savedIds.has(recipe.id);
  const displaySaveCount = Math.max(0, recipe.saveCount + savedDelta);

  const handleSaveClick = () => {
    const currentlySaved = isSaved;
    const deltaStep = currentlySaved ? -1 : 1;
    const started = toggleSave(recipe.id, currentlySaved, () => {
      setSavedDelta((prev) => prev - deltaStep);
    });
    if (started) {
      setSavedDelta((prev) => prev + deltaStep);
    }
  };

  return (
    <Card className="group relative flex h-full flex-col overflow-hidden transition-colors duration-200 focus-within:ring-2 focus-within:ring-ring hover:border-primary/40">
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
        {recipe.coverImageUrl ? (
          <Image
            src={recipe.coverImageUrl}
            alt={recipe.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover transition-transform duration-300 ease-out group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-secondary/50 text-muted-foreground transition-transform duration-300 ease-out group-hover:scale-105">
            <Utensils className="h-10 w-10 opacity-45" />
          </div>
        )}
        <div className="pointer-events-none absolute top-3 left-3 flex flex-wrap gap-1.5">
          <Badge variant="secondary" className="bg-card/90 text-foreground backdrop-blur-xs">
            {recipe.locale.toUpperCase()}
          </Badge>
          <Badge variant="secondary" className="bg-card/90 text-foreground backdrop-blur-xs">
            {tDiff(recipe.difficulty)}
          </Badge>
        </div>

        {showSaveButton ? (
          <Button
            type="button"
            size="icon"
            variant="secondary"
            onClick={handleSaveClick}
            aria-label={isSaved ? tRecipe("unsaveActionAria") : tRecipe("saveActionAria")}
            aria-pressed={isSaved}
            className="absolute top-3 right-3 z-10 h-8 w-8 rounded-full bg-card/90 text-foreground shadow-xs backdrop-blur-xs transition-colors hover:bg-card hover:text-primary"
          >
            <Bookmark className={cn("h-4 w-4", isSaved && "fill-primary text-primary")} />
          </Button>
        ) : null}
      </div>

      <CardContent className="flex flex-1 flex-col justify-between gap-3 p-4">
        <div>
          <h3 className="font-editorial line-clamp-2 text-lg font-semibold leading-snug transition-colors group-hover:text-primary">
            <Link
              href={`/recipes/${recipe.slug}`}
              className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none"
            >
              {recipe.title}
            </Link>
          </h3>
          {recipe.description ? (
            <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">
              {recipe.description}
            </p>
          ) : null}
        </div>

        <div className="space-y-2 pt-2">
          {showStatusBadges &&
          (recipe.visibility === "private" ||
            recipe.status === "draft" ||
            recipe.moderationStatus === "hidden") ? (
            <div className="flex flex-wrap gap-1">
              {recipe.status === "draft" ? (
                <Badge variant="muted" className="text-[11px]">
                  {tRecipe("draftBadge")}
                </Badge>
              ) : null}
              {recipe.visibility === "private" ? (
                <Badge variant="outline" className="text-[11px]">
                  {tRecipe("privateBadge")}
                </Badge>
              ) : null}
              {recipe.moderationStatus === "hidden" ? (
                <Badge variant="destructive" className="text-[11px]">
                  {tRecipe("hiddenBadge")}
                </Badge>
              ) : null}
            </div>
          ) : null}

          {recipe.categories.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {recipe.categories.slice(0, 2).map((cat) => (
                <Badge key={cat.slug} variant="muted" className="text-[11px]">
                  {locale === "uk" ? cat.nameUk : cat.nameEn}
                </Badge>
              ))}
            </div>
          ) : null}

          <div className="flex items-center justify-between border-t border-border pt-2.5 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1 font-medium text-foreground">
              <ChefHat className="h-3.5 w-3.5 text-primary" />@{recipe.authorUsername}
            </span>
            <div className="flex items-center gap-3 tabular-nums">
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {totalMinutes} {tCommon("minutes")}
              </span>
              <span className="inline-flex items-center gap-1">
                <Bookmark className="h-3.5 w-3.5" />
                {displaySaveCount}
              </span>
            </div>
          </div>
        </div>
      </CardContent>

      {editHref || onDelete ? (
        <div className="relative z-10 flex items-center justify-end gap-1.5 border-t border-border bg-muted/30 px-4 py-2.5">
          {editHref ? (
            <Button size="sm" variant="outline" asChild>
              <Link href={editHref}>
                <Pencil className="h-3.5 w-3.5" />
                <span>{tCommon("edit")}</span>
              </Link>
            </Button>
          ) : null}
          {onDelete ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={onDelete}
              aria-label={tCommon("delete")}
            >
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
