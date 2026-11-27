"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  INGREDIENT_UNITS,
  RECIPE_DIFFICULTIES,
  type RecipeFormValues,
  type RecipeInput,
  recipeInputSchema,
  SUPPORTED_LOCALES,
} from "@recipes/domain";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Loader2, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { useRouter } from "@/core/i18n/navigation";
import type { CategoryDto, TagDto } from "@/entities/recipe/server/recipe-service";
import { useAuthModalStore } from "@/features/auth-modal/model/use-auth-modal-store";
import {
  Badge,
  Button,
  Card,
  Checkbox,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Textarea,
} from "@/shared/ui";
import { useRecipeDraftAutosave } from "../model/use-draft-autosave";
import { RecipeImageUploader } from "./recipe-image-uploader";

export function RecipeForm({
  categories,
  initialValues,
  recipeId,
  scopeKey,
  duplicateWarning,
}: {
  categories: CategoryDto[];
  initialValues?: Partial<RecipeInput>;
  recipeId?: string;
  scopeKey: string;
  duplicateWarning?: boolean;
}) {
  const t = useTranslations("editor");
  const tCommon = useTranslations("common");
  const tDiff = useTranslations("difficulty");
  const tUnits = useTranslations("units");
  const tAuth = useTranslations("auth");
  const locale = useLocale();
  const router = useRouter();
  const openLogin = useAuthModalStore((s) => s.openLogin);
  const idPrefix = useId();
  const [tagInput, setTagInput] = useState("");

  const buildDefaults = useCallback(
    (values?: Partial<RecipeInput>): RecipeInput => ({
      title: values?.title ?? "",
      description: values?.description ?? "",
      coverImageUrl: values?.coverImageUrl ?? null,
      coverImageKey: values?.coverImageKey ?? null,
      baseServings: values?.baseServings ?? 4,
      prepTimeMin: values?.prepTimeMin ?? 15,
      cookTimeMin: values?.cookTimeMin ?? 30,
      difficulty: values?.difficulty ?? "medium",
      visibility: values?.visibility ?? "public",
      status: values?.status ?? "active",
      sourceUrl: values?.sourceUrl ?? null,
      locale: values?.locale ?? (locale === "en" ? "en" : "uk"),
      categorySlugs: values?.categorySlugs ?? [],
      tags: values?.tags ?? [],
      ingredients:
        values?.ingredients && values.ingredients.length > 0
          ? values.ingredients
          : [{ name: "", amount: 100, unit: "g", isScalable: true, groupName: null, note: null }],
      steps:
        values?.steps && values.steps.length > 0
          ? values.steps
          : [{ instruction: "", timerSeconds: null, imageUrl: null, imageKey: null }],
    }),
    [locale],
  );

  const defaults = useMemo(() => buildDefaults(initialValues), [buildDefaults, initialValues]);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<RecipeFormValues, unknown, RecipeInput>({
    mode: "onTouched",
    resolver: zodResolver(recipeInputSchema),
    defaultValues: defaults,
  });

  useEffect(() => {
    if (initialValues && !recipeId) {
      reset(buildDefaults(initialValues));
    }
  }, [initialValues, recipeId, reset, buildDefaults]);

  const ingredientArray = useFieldArray({ control, name: "ingredients" });
  const stepArray = useFieldArray({ control, name: "steps" });
  const watchedValues = watch();

  const { pendingDraft, lastAutosavedAt, dismissPendingDraft, consumePendingDraft, clearDraft } =
    useRecipeDraftAutosave({
      scopeKey,
      currentValues: watchedValues as Partial<RecipeInput>,
      isDirty,
    });

  const { data: tagSuggestions } = useQuery({
    queryKey: ["tag-suggestions", tagInput],
    enabled: tagInput.trim().length > 0,
    queryFn: async () => {
      const res = await fetch(`/api/v1/tags?q=${encodeURIComponent(tagInput.trim())}`);
      if (!res.ok) return { items: [] as TagDto[] };
      return (await res.json()) as { items: TagDto[] };
    },
  });

  const toggleCategory = (slug: string) => {
    const current = watchedValues.categorySlugs ?? [];
    const next = current.includes(slug)
      ? current.filter((c) => c !== slug)
      : [...current, slug].slice(0, 5);
    setValue("categorySlugs", next, { shouldDirty: true });
  };

  const addTag = (raw: string) => {
    const clean = raw.replace(/^#/, "").trim();
    if (!clean) return;
    const current = watchedValues.tags ?? [];
    if (!current.includes(clean) && current.length < 15) {
      setValue("tags", [...current, clean], { shouldDirty: true });
    }
    setTagInput("");
  };

  const submitWithStatus = (targetStatus: "draft" | "active") =>
    handleSubmit(async (values) => {
      const payload: RecipeInput = { ...values, status: targetStatus };
      const url = recipeId ? `/api/v1/recipes/by-id/${recipeId}` : "/api/v1/recipes";
      const method = recipeId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        if (res.status === 401) {
          openLogin(tAuth("authRequiredForAction"));
          return;
        }
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(err.error ?? tCommon("errorTitle"));
        return;
      }

      const saved = (await res.json()) as { slug: string };
      clearDraft();
      router.push(targetStatus === "draft" ? "/my-recipes?tab=drafts" : `/recipes/${saved.slug}`);
      router.refresh();
    });

  return (
    <form className="space-y-6" noValidate>
      {duplicateWarning ? (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-4 py-3 text-sm"
        >
          <AlertTriangle className="h-4 w-4 text-primary" />
          <span>{t("duplicateWarning")}</span>
        </div>
      ) : null}

      {pendingDraft ? (
        <Card className="flex flex-wrap items-center justify-between gap-3 border-primary/40 bg-secondary/40 p-4">
          <span className="text-sm">
            {t("draftDetected", {
              time: new Date(pendingDraft.savedAt).toLocaleTimeString(),
            })}
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => {
                const restored = consumePendingDraft();
                if (restored) {
                  reset({ ...defaults, ...restored });
                }
              }}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>{t("restoreDraft")}</span>
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={dismissPendingDraft}>
              {t("discardDraft")}
            </Button>
          </div>
        </Card>
      ) : null}

      <Card className="space-y-5 p-5">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor={`${idPrefix}-title`}>{t("titleLabel")}</Label>
          {lastAutosavedAt ? (
            <span className="text-xs text-muted-foreground">
              {t("autosaved")} ({lastAutosavedAt})
            </span>
          ) : null}
        </div>
        <Input
          id={`${idPrefix}-title`}
          required
          aria-invalid={errors.title ? "true" : "false"}
          {...register("title")}
        />
        {errors.title ? <p className="text-xs text-destructive">{errors.title.message}</p> : null}

        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-desc`}>{t("descriptionLabel")}</Label>
          <Textarea id={`${idPrefix}-desc`} rows={3} {...register("description")} />
        </div>

        <div className="space-y-1.5">
          <Label>{t("coverLabel")}</Label>
          <RecipeImageUploader
            valueUrl={watchedValues.coverImageUrl}
            onChange={({ url, key }) => {
              setValue("coverImageUrl", url, { shouldDirty: true });
              setValue("coverImageKey", key, { shouldDirty: true });
            }}
          />
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          <div className="space-y-1.5">
            <Label htmlFor={`${idPrefix}-servings`}>{t("servingsLabel")}</Label>
            <Input
              id={`${idPrefix}-servings`}
              type="number"
              min={1}
              max={100}
              {...register("baseServings", { valueAsNumber: true })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${idPrefix}-prep`}>{t("prepTimeLabel")}</Label>
            <Input
              id={`${idPrefix}-prep`}
              type="number"
              min={0}
              max={1440}
              {...register("prepTimeMin", { valueAsNumber: true })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${idPrefix}-cook`}>{t("cookTimeLabel")}</Label>
            <Input
              id={`${idPrefix}-cook`}
              type="number"
              min={0}
              max={1440}
              {...register("cookTimeMin", { valueAsNumber: true })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("difficultyLabel")}</Label>
            <Controller
              control={control}
              name="difficulty"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RECIPE_DIFFICULTIES.map((diff) => (
                      <SelectItem key={diff} value={diff}>
                        {tDiff(diff)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("localeLabel")}</Label>
            <Controller
              control={control}
              name="locale"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORTED_LOCALES.map((loc) => (
                      <SelectItem key={loc} value={loc}>
                        {loc.toUpperCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>{t("categoriesLabel")}</Label>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => {
              const selected = (watchedValues.categorySlugs ?? []).includes(cat.slug);
              return (
                <Button
                  key={cat.slug}
                  type="button"
                  size="sm"
                  variant={selected ? "default" : "outline"}
                  onClick={() => toggleCategory(cat.slug)}
                >
                  {locale === "uk" ? cat.nameUk : cat.nameEn}
                </Button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-tags`}>{t("tagsLabel")}</Label>
          <div className="flex gap-2">
            <Input
              id={`${idPrefix}-tags`}
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  addTag(tagInput);
                }
              }}
              placeholder="#швидко"
            />
            <Button type="button" variant="outline" onClick={() => addTag(tagInput)}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {tagSuggestions && tagSuggestions.items.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {tagSuggestions.items.slice(0, 6).map((suggestion) => (
                <button
                  key={suggestion.id}
                  type="button"
                  onClick={() => addTag(suggestion.name)}
                  className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  #{suggestion.name}
                </button>
              ))}
            </div>
          ) : null}
          {(watchedValues.tags ?? []).length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {(watchedValues.tags ?? []).map((tag) => (
                <Badge key={tag} variant="secondary" className="gap-1">
                  #{tag}
                  <button
                    type="button"
                    onClick={() =>
                      setValue(
                        "tags",
                        (watchedValues.tags ?? []).filter((item) => item !== tag),
                        { shouldDirty: true },
                      )
                    }
                    aria-label={tCommon("delete")}
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
          ) : null}
        </div>
      </Card>

      <Card className="space-y-4 p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-editorial text-xl font-semibold">{t("ingredientsLabel")}</h2>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              ingredientArray.append({
                name: "",
                amount: 100,
                unit: "g",
                isScalable: true,
                groupName: null,
                note: null,
              })
            }
          >
            <Plus className="h-4 w-4" />
            <span>{t("addIngredient")}</span>
          </Button>
        </div>

        <div className="space-y-3">
          {ingredientArray.fields.map((field, index) => (
            <div
              key={field.id}
              className="grid grid-cols-1 gap-2 rounded-lg border border-border p-3 md:grid-cols-[1.5fr_0.7fr_0.8fr_1fr_auto]"
            >
              <Input
                placeholder={t("ingredientNamePlaceholder")}
                {...register(`ingredients.${index}.name`)}
              />
              <Input
                type="number"
                step="any"
                placeholder={t("amountPlaceholder")}
                {...register(`ingredients.${index}.amount`, {
                  setValueAs: (v) => (v === "" || v === null ? null : Number(v)),
                })}
              />
              <Controller
                control={control}
                name={`ingredients.${index}.unit`}
                render={({ field: unitField }) => (
                  <Select value={unitField.value} onValueChange={unitField.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {INGREDIENT_UNITS.map((unit) => (
                        <SelectItem key={unit} value={unit}>
                          {tUnits(unit)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <Input
                placeholder={t("notePlaceholder")}
                {...register(`ingredients.${index}.note`)}
              />
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor={`${idPrefix}-scalable-${index}`}
                  className="flex items-center gap-1.5 text-xs"
                >
                  <Controller
                    control={control}
                    name={`ingredients.${index}.isScalable`}
                    render={({ field: scaleField }) => (
                      <Checkbox
                        id={`${idPrefix}-scalable-${index}`}
                        checked={scaleField.value}
                        onCheckedChange={(v) => scaleField.onChange(Boolean(v))}
                      />
                    )}
                  />
                  <span>{t("scalableLabel")}</span>
                </label>
                {ingredientArray.fields.length > 1 ? (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => ingredientArray.remove(index)}
                    aria-label={tCommon("delete")}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="space-y-4 p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-editorial text-xl font-semibold">{t("stepsLabel")}</h2>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              stepArray.append({
                instruction: "",
                timerSeconds: null,
                imageUrl: null,
                imageKey: null,
              })
            }
          >
            <Plus className="h-4 w-4" />
            <span>{t("addStep")}</span>
          </Button>
        </div>

        <div className="space-y-3">
          {stepArray.fields.map((field, index) => (
            <div key={field.id} className="space-y-2 rounded-lg border border-border p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-primary">#{index + 1}</span>
                {stepArray.fields.length > 1 ? (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => stepArray.remove(index)}
                    aria-label={tCommon("delete")}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                ) : null}
              </div>
              <Textarea
                rows={2}
                placeholder={t("stepPlaceholder")}
                {...register(`steps.${index}.instruction`)}
              />
              <Input
                type="number"
                min={0}
                max={86400}
                placeholder={t("timerPlaceholder")}
                className="max-w-44"
                {...register(`steps.${index}.timerSeconds`, {
                  setValueAs: (v) => (v === "" || v === null ? null : Number(v)),
                })}
              />
            </div>
          ))}
        </div>
      </Card>

      <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="flex items-center gap-3">
          <Controller
            control={control}
            name="visibility"
            render={({ field }) => (
              <Switch
                id={`${idPrefix}-private-switch`}
                checked={field.value === "private"}
                onCheckedChange={(checked) => field.onChange(checked ? "private" : "public")}
              />
            )}
          />
          <div>
            <Label htmlFor={`${idPrefix}-private-switch`}>{t("privateToggleLabel")}</Label>
            <p className="text-xs text-muted-foreground">{t("privateToggleHint")}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={submitWithStatus("draft")}
          >
            {t("saveDraft")}
          </Button>
          <Button type="button" disabled={isSubmitting} onClick={submitWithStatus("active")}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            <span>{recipeId ? t("saveChanges") : t("publish")}</span>
          </Button>
        </div>
      </Card>
    </form>
  );
}
