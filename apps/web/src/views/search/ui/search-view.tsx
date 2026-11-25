"use client";

import { useQuery } from "@tanstack/react-query";
import { RotateCcw, Search, SlidersHorizontal } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, useEffect, useState } from "react";
import { usePathname, useRouter } from "@/core/i18n/navigation";
import type { CategoryDto, RecipeCardDto } from "@/entities/recipe/server/recipe-service";
import { RecipeCard } from "@/entities/recipe/ui/recipe-card";
import {
  Button,
  Card,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
} from "@/shared/ui";

interface SearchResponse {
  items: RecipeCardDto[];
  total: number;
  page: number;
  limit: number;
}

export function SearchView({ categories }: { categories: CategoryDto[] }) {
  const t = useTranslations("search");
  const tCommon = useTranslations("common");
  const tDiff = useTranslations("difficulty");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const qParam = searchParams.get("q") ?? "";
  const categoryParam = searchParams.get("category") ?? "all";
  const tagParam = searchParams.get("tag") ?? "";
  const recipeLocaleParam = searchParams.get("locale") ?? "all";
  const difficultyParam = searchParams.get("difficulty") ?? "all";
  const maxTimeParam = searchParams.get("maxTime") ?? "any";
  const sortParam = searchParams.get("sort") ?? "latest";

  const [inputValue, setInputValue] = useState(qParam);

  useEffect(() => {
    setInputValue(qParam);
  }, [qParam]);

  const updateParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams.toString());
    if (!value || value === "all" || value === "any") {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  };

  const resetAll = () => {
    setInputValue("");
    router.replace(pathname);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    updateParam("q", inputValue.trim() || null);
  };

  const apiParams = new URLSearchParams();
  if (qParam) apiParams.set("q", qParam);
  if (categoryParam !== "all") apiParams.set("category", categoryParam);
  if (tagParam) apiParams.set("tag", tagParam);
  if (recipeLocaleParam !== "all") apiParams.set("locale", recipeLocaleParam);
  if (difficultyParam !== "all") apiParams.set("difficulty", difficultyParam);
  if (maxTimeParam !== "any") apiParams.set("maxTime", maxTimeParam);
  apiParams.set("sort", sortParam);

  const { data, isLoading } = useQuery<SearchResponse>({
    queryKey: ["recipes-search", apiParams.toString()],
    queryFn: async () => {
      const res = await fetch(`/api/v1/recipes?${apiParams.toString()}`);
      if (!res.ok) {
        return { items: [], total: 0, page: 1, limit: 12 };
      }
      return (await res.json()) as SearchResponse;
    },
  });

  return (
    <main className="mx-auto w-full max-w-6xl space-y-8 px-4 py-8">
      <div className="space-y-2">
        <h1 className="font-editorial text-3xl font-bold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <Card className="space-y-5 p-5">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={tCommon("searchPlaceholder")}
              enterKeyHint="search"
              className="pl-10"
            />
          </div>
          <Button type="submit">{t("title")}</Button>
          <Button type="button" variant="outline" onClick={resetAll} className="gap-1.5">
            <RotateCcw className="h-4 w-4" />
            <span>{t("resetFilters")}</span>
          </Button>
        </form>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-1.5">
            <Label>{t("categoryLabel")}</Label>
            <Select value={categoryParam} onValueChange={(v) => updateParam("category", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("allCategories")}</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.slug} value={cat.slug}>
                    {locale === "uk" ? cat.nameUk : cat.nameEn}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>{t("languageLabel")}</Label>
            <Select value={recipeLocaleParam} onValueChange={(v) => updateParam("locale", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("allLanguages")}</SelectItem>
                <SelectItem value="uk">{t("ukrainianOnly")}</SelectItem>
                <SelectItem value="en">{t("englishOnly")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>{t("difficultyLabel")}</Label>
            <Select value={difficultyParam} onValueChange={(v) => updateParam("difficulty", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("allDifficulties")}</SelectItem>
                <SelectItem value="easy">{tDiff("easy")}</SelectItem>
                <SelectItem value="medium">{tDiff("medium")}</SelectItem>
                <SelectItem value="hard">{tDiff("hard")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>{t("maxTimeLabel")}</Label>
            <Select value={maxTimeParam} onValueChange={(v) => updateParam("maxTime", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">{t("anyTime")}</SelectItem>
                <SelectItem value="30">{t("upTo30")}</SelectItem>
                <SelectItem value="60">{t("upTo60")}</SelectItem>
                <SelectItem value="120">{t("upTo120")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>{t("sortLabel")}</Label>
            <Select value={sortParam} onValueChange={(v) => updateParam("sort", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="latest">{t("sortLatest")}</SelectItem>
                <SelectItem value="popular">{t("sortPopular")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-1.5 tabular-nums">
          <SlidersHorizontal className="h-4 w-4" />
          {t("resultsCount", { count: data?.total ?? 0 })}
        </span>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {["s1", "s2", "s3"].map((id) => (
            <Skeleton key={id} className="h-72 rounded-lg" />
          ))}
        </div>
      ) : (data?.items.length ?? 0) === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-3 border-dashed p-12 text-center">
          <h2 className="font-editorial text-xl font-semibold">{t("emptyTitle")}</h2>
          <p className="max-w-md text-sm text-muted-foreground">{t("emptyDescription")}</p>
          <Button variant="outline" onClick={resetAll}>
            {t("resetFilters")}
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {data?.items.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      )}
    </main>
  );
}
