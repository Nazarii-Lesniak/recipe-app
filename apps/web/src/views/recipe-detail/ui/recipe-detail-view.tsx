"use client";

import { scaleRecipeIngredients } from "@recipes/domain";
import {
  Bookmark,
  ChefHat,
  Clock,
  ExternalLink,
  Flame,
  GitFork,
  Minus,
  Pencil,
  Plus,
  Timer,
  Utensils,
} from "lucide-react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { useSession } from "@/core/auth/auth-client";
import { Link, useRouter } from "@/core/i18n/navigation";
import type { RecipeDetailDto } from "@/entities/recipe/server/recipe-service";
import { useAuthModalStore } from "@/features/auth-modal/model/use-auth-modal-store";
import { useServingsStore } from "@/features/scale-servings/model/use-servings-store";
import { Badge, Button, Card, Checkbox, Separator } from "@/shared/ui";
import { OnboardingHint } from "@/shared/ui/onboarding-hint";
import { CookingMode } from "@/widgets/cooking-mode/ui/cooking-mode";

export function RecipeDetailView({
  recipe,
  viewerId,
  viewerRole,
}: {
  recipe: RecipeDetailDto;
  viewerId?: string | null;
  viewerRole?: string | null;
}) {
  const t = useTranslations("recipe");
  const tCommon = useTranslations("common");
  const tDiff = useTranslations("difficulty");
  const tUnits = useTranslations("units");
  const tAuth = useTranslations("auth");
  const locale = useLocale();
  const router = useRouter();
  const { data: session } = useSession();
  const { openLogin } = useAuthModalStore();

  const servingsByRecipe = useServingsStore((s) => s.servingsByRecipe);
  const unitSystem = useServingsStore((s) => s.unitSystem);
  const setServings = useServingsStore((s) => s.setServings);
  const setUnitSystem = useServingsStore((s) => s.setUnitSystem);

  const currentServings = servingsByRecipe[recipe.id] ?? recipe.baseServings;
  const [checkedIngredients, setCheckedIngredients] = useState<Record<string, boolean>>({});
  const [isSaved, setIsSaved] = useState(recipe.isSaved);
  const [saveCount, setSaveCount] = useState(recipe.saveCount);
  const [forking, setForking] = useState(false);
  const [cookingModeOpen, setCookingModeOpen] = useState(false);

  const scaledIngredients = scaleRecipeIngredients(
    recipe.ingredients,
    recipe.baseServings,
    currentServings,
    unitSystem,
  );

  const groupedIngredients = new Map<string, typeof scaledIngredients>();
  for (const item of scaledIngredients) {
    const key = item.groupName ?? "__default__";
    const list = groupedIngredients.get(key) ?? [];
    list.push(item);
    groupedIngredients.set(key, list);
  }

  const isAuthenticated = Boolean(session?.user || viewerId);
  const canEdit = Boolean(viewerId && (viewerId === recipe.authorId || viewerRole === "admin"));
  const totalTime = recipe.prepTimeMin + recipe.cookTimeMin;

  const handleToggleSave = async () => {
    if (!isAuthenticated) {
      openLogin(tAuth("authRequiredForAction"));
      return;
    }

    const nextSaved = !isSaved;
    setIsSaved(nextSaved);
    setSaveCount((c) => Math.max(0, c + (nextSaved ? 1 : -1)));

    try {
      const res = await fetch(`/api/v1/recipes/by-id/${recipe.id}/save`, {
        method: nextSaved ? "POST" : "DELETE",
      });
      if (!res.ok) {
        throw new Error("save_failed");
      }
    } catch {
      setIsSaved(!nextSaved);
      setSaveCount((c) => Math.max(0, c + (nextSaved ? -1 : 1)));
      toast.error(tCommon("errorTitle"));
    }
  };

  const handleFork = async () => {
    if (!isAuthenticated) {
      openLogin(tAuth("authRequiredForAction"));
      return;
    }

    setForking(true);
    try {
      const res = await fetch(`/api/v1/recipes/by-id/${recipe.id}/fork`, {
        method: "POST",
      });
      if (!res.ok) {
        throw new Error("fork_failed");
      }
      const created = (await res.json()) as { id: string };
      router.push(`/recipes/${created.id}/edit`);
    } catch {
      toast.error(tCommon("errorTitle"));
      setForking(false);
    }
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Recipe",
    name: recipe.title,
    description: recipe.description,
    image: recipe.coverImageUrl ? [recipe.coverImageUrl] : undefined,
    author: { "@type": "Person", name: `@${recipe.authorUsername}` },
    recipeYield: `${recipe.baseServings}`,
    prepTime: `PT${recipe.prepTimeMin}M`,
    cookTime: `PT${recipe.cookTimeMin}M`,
    totalTime: `PT${totalTime}M`,
    recipeIngredient: recipe.ingredients.map((i) =>
      [i.amount ?? "", i.unit, i.name].filter(Boolean).join(" "),
    ),
    recipeInstructions: recipe.steps.map((s) => ({
      "@type": "HowToStep",
      text: s.instruction,
    })),
  };

  return (
    <main className="mx-auto w-full max-w-5xl space-y-8 px-4 py-8">
      <script type="application/ld+json">
        {JSON.stringify(jsonLd).replace(/</g, "\\u003c")}
      </script>

      {recipe.moderationStatus === "hidden" && recipe.moderationNote ? (
        <div
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          <strong>{t("hiddenBadge")}:</strong> {t("hiddenReason", { reason: recipe.moderationNote })}
        </div>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{recipe.locale.toUpperCase()}</Badge>
            <Badge variant="secondary">{tDiff(recipe.difficulty)}</Badge>
            {recipe.visibility === "private" ? (
              <Badge variant="outline">{t("privateBadge")}</Badge>
            ) : null}
            {recipe.status === "draft" ? <Badge variant="muted">{t("draftBadge")}</Badge> : null}
            {recipe.categories.map((cat) => (
              <Link key={cat.slug} href={`/categories/${cat.slug}`}>
                <Badge variant="muted" className="hover:bg-secondary">
                  {locale === "uk" ? cat.nameUk : cat.nameEn}
                </Badge>
              </Link>
            ))}
          </div>

          <h1 className="font-editorial text-3xl font-bold tracking-tight sm:text-4xl">
            {recipe.title}
          </h1>

          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
              <ChefHat className="h-4 w-4 text-primary" />
              {t("byAuthor")}: @{recipe.authorUsername}
            </span>
            {recipe.forkedFrom ? (
              <Link
                href={`/recipes/${recipe.forkedFrom.slug}`}
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                <GitFork className="h-3.5 w-3.5" />
                {t("forkedFrom")} @{recipe.forkedFrom.authorUsername}
              </Link>
            ) : null}
          </div>

          {recipe.description ? (
            <p className="text-base leading-relaxed text-muted-foreground">{recipe.description}</p>
          ) : null}

          <div className="grid grid-cols-3 gap-3 rounded-xl border border-border bg-card p-4 text-center tabular-nums">
            <div>
              <div className="text-xs text-muted-foreground">{t("prepTime")}</div>
              <div className="mt-1 font-semibold">
                {recipe.prepTimeMin} {tCommon("minutes")}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">{t("cookTime")}</div>
              <div className="mt-1 font-semibold">
                {recipe.cookTimeMin} {tCommon("minutes")}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">{t("totalTime")}</div>
              <div className="mt-1 inline-flex items-center gap-1 font-semibold text-primary">
                <Clock className="h-4 w-4" />
                {totalTime} {tCommon("minutes")}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <Button onClick={handleToggleSave} variant={isSaved ? "secondary" : "outline"}>
              <Bookmark className={`h-4 w-4 ${isSaved ? "fill-current" : ""}`} />
              <span>
                {isSaved ? t("savedBookmark") : t("saveBookmark")} ({saveCount})
              </span>
            </Button>

            <Button onClick={handleFork} variant="outline" disabled={forking}>
              <GitFork className="h-4 w-4" />
              <span>{t("forkAction")}</span>
            </Button>

            <Button onClick={() => setCookingModeOpen(true)} variant="default">
              <Flame className="h-4 w-4" />
              <span>{t("cookingMode")}</span>
            </Button>

            {canEdit ? (
              <Button variant="ghost" asChild>
                <Link href={`/recipes/${recipe.id}/edit`}>
                  <Pencil className="h-4 w-4" />
                  <span>{tCommon("edit")}</span>
                </Link>
              </Button>
            ) : null}
          </div>

          <OnboardingHint hintId="fork-recipe" text={t("forkHint")} />

          {recipe.tags.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {recipe.tags.map((tag) => (
                <Link key={tag.slug} href={`/search?tag=${encodeURIComponent(tag.slug)}`}>
                  <Badge variant="outline">#{tag.name}</Badge>
                </Link>
              ))}
            </div>
          ) : null}

          {recipe.sourceUrl ? (
            <a
              href={recipe.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>{t("sourceLink")}</span>
            </a>
          ) : null}
        </div>

        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-border bg-muted">
          {recipe.coverImageUrl ? (
            <Image
              src={recipe.coverImageUrl}
              alt={recipe.title}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 45vw"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-secondary/50 text-muted-foreground">
              <Utensils className="h-14 w-14 opacity-40" />
            </div>
          )}
        </div>
      </div>

      <Separator />

      <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr]">
        <Card className="h-fit space-y-5 p-5">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-editorial text-xl font-bold">{t("ingredientsTitle")}</h2>
              <div className="flex rounded-md border border-border bg-muted p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setUnitSystem("metric")}
                  className={`rounded-sm px-2 py-1 ${unitSystem === "metric" ? "bg-card font-medium text-foreground shadow-xs" : "text-muted-foreground"}`}
                >
                  Metric
                </button>
                <button
                  type="button"
                  onClick={() => setUnitSystem("imperial")}
                  className={`rounded-sm px-2 py-1 ${unitSystem === "imperial" ? "bg-card font-medium text-foreground shadow-xs" : "text-muted-foreground"}`}
                >
                  Imperial
                </button>
              </div>
            </div>

            <div className="rounded-lg bg-muted/60 p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">{t("scalerTitle")}</span>
                <div className="flex items-center gap-2 tabular-nums">
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="h-8 w-8"
                    aria-label="-1"
                    onClick={() => setServings(recipe.id, currentServings - 1)}
                    disabled={currentServings <= 1}
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </Button>
                  <span className="min-w-16 text-center text-sm font-semibold">
                    {currentServings} {tCommon("servings")}
                  </span>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="h-8 w-8"
                    aria-label="+1"
                    onClick={() => setServings(recipe.id, currentServings + 1)}
                    disabled={currentServings >= 50}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {[0.5, 1, 2, 3].map((mult) => {
                  const target = Math.max(1, Math.min(50, Math.round(recipe.baseServings * mult)));
                  return (
                    <Button
                      key={mult}
                      type="button"
                      size="sm"
                      variant={currentServings === target ? "default" : "outline"}
                      onClick={() => setServings(recipe.id, target)}
                      className="h-7 px-2.5 text-xs tabular-nums"
                    >
                      {mult}x ({target})
                    </Button>
                  );
                })}
              </div>
            </div>

            <OnboardingHint hintId="portion-scaler" text={t("scalerHint")} />
          </div>

          <div className="space-y-5">
            {Array.from(groupedIngredients.entries()).map(([groupName, items]) => (
              <div key={groupName} className="space-y-2">
                {groupName !== "__default__" ? (
                  <h3 className="text-xs font-semibold tracking-wide text-primary uppercase">
                    {groupName}
                  </h3>
                ) : null}
                <ul className="space-y-2">
                  {items.map((ing, index) => {
                    const itemKey = ing.id ?? `${groupName}-${index}`;
                    const checked = Boolean(checkedIngredients[itemKey]);
                    const unitLabel = tUnits.has(ing.displayUnit)
                      ? tUnits(ing.displayUnit as Parameters<typeof tUnits>[0])
                      : ing.displayUnit;

                    return (
                      <li key={itemKey} className="flex items-start gap-2.5 text-sm">
                        <Checkbox
                          id={`ing-${itemKey}`}
                          checked={checked}
                          onCheckedChange={(v) =>
                            setCheckedIngredients((prev) => ({
                              ...prev,
                              [itemKey]: Boolean(v),
                            }))
                          }
                          className="mt-0.5"
                        />
                        <label
                          htmlFor={`ing-${itemKey}`}
                          className={`flex-1 cursor-pointer leading-snug ${checked ? "line-through text-muted-foreground" : ""}`}
                        >
                          <span className="font-semibold tabular-nums">
                            {ing.formattedAmount ? `${ing.formattedAmount} ` : ""}
                            {ing.displayUnit === "to_taste" || ing.formattedAmount ? unitLabel : ""}
                          </span>{" "}
                          <span>{ing.name}</span>
                          {ing.note ? (
                            <span className="text-muted-foreground"> ({ing.note})</span>
                          ) : null}
                          {!ing.isScalable ? (
                            <Badge variant="muted" className="ml-2 text-[10px]">
                              {t("nonScalableBadge")}
                            </Badge>
                          ) : null}
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </Card>

        <section className="space-y-4">
          <h2 className="font-editorial text-2xl font-bold">{t("stepsTitle")}</h2>
          <ol className="space-y-4">
            {recipe.steps.map((step) => (
              <li key={step.id}>
                <Card className="space-y-3 p-5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-editorial text-sm font-bold text-primary">
                      {t("stepNumber", { number: step.stepNumber })}
                    </span>
                    {step.timerSeconds && step.timerSeconds > 0 ? (
                      <Badge variant="secondary" className="gap-1 tabular-nums">
                        <Timer className="h-3.5 w-3.5" />
                        {Math.ceil(step.timerSeconds / 60)} {tCommon("minutes")}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">
                    {step.instruction}
                  </p>
                </Card>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <CookingMode
        open={cookingModeOpen}
        onClose={() => setCookingModeOpen(false)}
        recipe={recipe}
        scaledIngredients={scaledIngredients}
        checkedIngredients={checkedIngredients}
        onToggleIngredient={(key, checked) =>
          setCheckedIngredients((prev) => ({ ...prev, [key]: checked }))
        }
      />
    </main>
  );
}
