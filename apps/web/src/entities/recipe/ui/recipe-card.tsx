"use client";

import { Bookmark, Clock, ChefHat, Utensils } from "lucide-react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/core/i18n/navigation";
import type { RecipeCardDto } from "@/entities/recipe/server/recipe-service";
import { Badge, Card, CardContent } from "@/shared/ui";

export function RecipeCard({ recipe }: { recipe: RecipeCardDto }) {
  const tDiff = useTranslations("difficulty");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const totalMinutes = recipe.prepTimeMin + recipe.cookTimeMin;

  return (
    <Link href={`/recipes/${recipe.slug}`} className="group block h-full">
      <Card className="flex h-full flex-col overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
          {recipe.coverImageUrl ? (
            <Image
              src={recipe.coverImageUrl}
              alt={recipe.title}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-cover transition-transform duration-300 group-hover:scale-103"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-secondary/50 text-muted-foreground">
              <Utensils className="h-10 w-10 opacity-45" />
            </div>
          )}
          <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
            <Badge variant="secondary" className="bg-card/90 text-foreground backdrop-blur-xs">
              {recipe.locale.toUpperCase()}
            </Badge>
            <Badge variant="secondary" className="bg-card/90 text-foreground backdrop-blur-xs">
              {tDiff(recipe.difficulty)}
            </Badge>
          </div>
        </div>

        <CardContent className="flex flex-1 flex-col justify-between gap-3 p-4">
          <div>
            <h3 className="font-editorial line-clamp-2 text-lg font-semibold leading-snug group-hover:text-primary">
              {recipe.title}
            </h3>
            {recipe.description ? (
              <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">
                {recipe.description}
              </p>
            ) : null}
          </div>

          <div className="space-y-2 pt-2">
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
                  {recipe.saveCount}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
