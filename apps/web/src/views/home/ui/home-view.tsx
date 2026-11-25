"use client";

import { ArrowRight, Plus, Search, Sparkles, UtensilsCrossed } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";
import { Link, useRouter } from "@/core/i18n/navigation";
import type { CategoryDto, RecipeCardDto } from "@/entities/recipe/server/recipe-service";
import { RecipeCard } from "@/entities/recipe/ui/recipe-card";
import { Badge, Button, Card, Input } from "@/shared/ui";

export function HomeView({
  categories,
  latestRecipes,
  popularRecipes,
}: {
  categories: CategoryDto[];
  latestRecipes: RecipeCardDto[];
  popularRecipes: RecipeCardDto[];
}) {
  const t = useTranslations("home");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const [query, setQuery] = useState("");

  const handleSearch = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = query.trim();
    router.push(trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : "/search");
  };

  const hasRecipes = latestRecipes.length > 0 || popularRecipes.length > 0;

  return (
    <main className="mx-auto w-full max-w-6xl space-y-14 px-4 py-8 md:py-12">
      <section className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card via-card to-secondary/60 p-6 md:p-12">
        <div className="max-w-2xl space-y-5">
          <Badge variant="secondary" className="gap-1.5 px-3 py-1">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span>{t("heroBadge")}</span>
          </Badge>

          <h1 className="font-editorial text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            {t("heroTitle")}
          </h1>

          <p className="text-base leading-relaxed text-muted-foreground md:text-lg">
            {t("heroSubtitle")}
          </p>

          <form onSubmit={handleSearch} className="flex flex-col gap-2.5 pt-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={tCommon("searchPlaceholder")}
                enterKeyHint="search"
                className="h-11 pl-10"
              />
            </div>
            <Button type="submit" size="lg">
              {t("heroSearchCta")}
            </Button>
            <Button type="button" size="lg" variant="outline" asChild>
              <Link href="/recipes/new">
                <Plus className="h-4 w-4" />
                <span>{t("heroCreateCta")}</span>
              </Link>
            </Button>
          </form>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-editorial text-2xl font-bold">{t("categoriesTitle")}</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/search" className="gap-1">
              <span>{t("viewAll")}</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9">
          {categories.map((category) => (
            <Link
              key={category.slug}
              href={`/categories/${category.slug}`}
              className="group flex flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card p-3.5 text-center transition-colors hover:border-primary/50 hover:bg-secondary/40"
            >
              <span className="text-sm font-medium text-foreground group-hover:text-primary">
                {locale === "uk" ? category.nameUk : category.nameEn}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {!hasRecipes ? (
        <Card className="flex flex-col items-center justify-center gap-4 border-dashed p-12 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-primary">
            <UtensilsCrossed className="h-7 w-7" />
          </div>
          <div className="max-w-md space-y-1.5">
            <h2 className="font-editorial text-xl font-semibold">{t("emptyCatalogTitle")}</h2>
            <p className="text-sm text-muted-foreground">{t("emptyCatalogDescription")}</p>
          </div>
          <Button asChild>
            <Link href="/recipes/new">
              <Plus className="h-4 w-4" />
              <span>{t("emptyCatalogCta")}</span>
            </Link>
          </Button>
        </Card>
      ) : (
        <>
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-editorial text-2xl font-bold">{t("latestTitle")}</h2>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/search?sort=latest">{t("viewAll")}</Link>
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {latestRecipes.map((recipe) => (
                <RecipeCard key={recipe.id} recipe={recipe} />
              ))}
            </div>
          </section>

          {popularRecipes.length > 0 ? (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-editorial text-2xl font-bold">{t("popularTitle")}</h2>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/search?sort=popular">{t("viewAll")}</Link>
                </Button>
              </div>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {popularRecipes.map((recipe) => (
                  <RecipeCard key={recipe.id} recipe={recipe} />
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}
    </main>
  );
}
