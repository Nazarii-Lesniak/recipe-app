import { z } from "zod";
import {
  INGREDIENT_UNITS,
  type Locale,
  RECIPE_DIFFICULTIES,
  RECIPE_LIMITS,
  RECIPE_STATUSES,
  RECIPE_VISIBILITIES,
  SEED_CATEGORIES,
  SUPPORTED_LOCALES,
} from "../constants";

const optionalTrimmedString = (maxLength: number) =>
  z
    .string()
    .trim()
    .max(maxLength)
    .optional()
    .nullable()
    .transform((value) => (value && value.length > 0 ? value : null));

const optionalUrlSchema = z
  .string()
  .trim()
  .url()
  .max(2048)
  .optional()
  .nullable()
  .or(z.literal("").transform(() => null));

export const recipeIngredientInputSchema = z.object({
  groupName: optionalTrimmedString(60),
  name: z
    .string()
    .trim()
    .min(1, "ingredient_name_required")
    .max(RECIPE_LIMITS.ingredientNameMax, "ingredient_name_too_long"),
  amount: z
    .number()
    .positive("ingredient_amount_positive")
    .max(RECIPE_LIMITS.ingredientAmountMax, "ingredient_amount_too_large")
    .nullable()
    .optional()
    .transform((value) => (value === undefined ? null : value)),
  unit: z.enum(INGREDIENT_UNITS).default("g"),
  note: optionalTrimmedString(120),
  isScalable: z.boolean().default(true),
});

export const recipeStepInputSchema = z.object({
  instruction: z
    .string()
    .trim()
    .min(1, "step_instruction_required")
    .max(RECIPE_LIMITS.stepInstructionMax, "step_instruction_too_long"),
  timerSeconds: z
    .number()
    .int()
    .min(0)
    .max(86_400)
    .nullable()
    .optional()
    .transform((value) => (value === undefined ? null : value)),
  imageUrl: optionalUrlSchema,
  imageKey: optionalTrimmedString(255),
});

export const recipeInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(RECIPE_LIMITS.titleMin, "title_too_short")
    .max(RECIPE_LIMITS.titleMax, "title_too_long"),
  description: z
    .string()
    .trim()
    .max(RECIPE_LIMITS.descriptionMax, "description_too_long")
    .default(""),
  coverImageUrl: optionalUrlSchema,
  coverImageKey: optionalTrimmedString(255),
  baseServings: z
    .number()
    .int()
    .min(RECIPE_LIMITS.servingsMin)
    .max(RECIPE_LIMITS.servingsMax)
    .default(4),
  prepTimeMin: z.number().int().min(0).max(1440).default(15),
  cookTimeMin: z.number().int().min(0).max(1440).default(30),
  difficulty: z.enum(RECIPE_DIFFICULTIES).default("medium"),
  visibility: z.enum(RECIPE_VISIBILITIES).default("public"),
  status: z.enum(RECIPE_STATUSES).default("active"),
  sourceUrl: optionalUrlSchema,
  locale: z.enum(SUPPORTED_LOCALES).default("uk"),
  categorySlugs: z.array(z.string().trim().min(1).max(60)).max(5).default([]),
  tags: z.array(z.string().trim().min(1).max(40)).max(15).default([]),
  ingredients: z
    .array(recipeIngredientInputSchema)
    .min(RECIPE_LIMITS.ingredientsMin, "ingredients_min")
    .max(RECIPE_LIMITS.ingredientsMax, "ingredients_max"),
  steps: z
    .array(recipeStepInputSchema)
    .min(RECIPE_LIMITS.stepsMin, "steps_min")
    .max(RECIPE_LIMITS.stepsMax, "steps_max"),
});

export const recipePatchSchema = recipeInputSchema.partial();

export const searchRecipesQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  category: z.string().trim().max(60).optional(),
  tag: z.string().trim().max(60).optional(),
  locale: z.enum(["all", "uk", "en"]).default("all"),
  difficulty: z.enum(["all", ...RECIPE_DIFFICULTIES]).default("all"),
  maxTime: z.coerce.number().int().positive().max(1440).optional(),
  sort: z.enum(["latest", "popular"]).default("latest"),
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(48).default(12),
});

export const moderationActionSchema = z
  .object({
    action: z.enum(["approved", "hidden"]),
    reason: z.string().trim().max(500).optional(),
  })
  .refine(
    (data) =>
      data.action !== "hidden" || (typeof data.reason === "string" && data.reason.trim().length >= 3),
    {
      message: "moderation_reason_required",
      path: ["reason"],
    },
  );

export const aiImportRequestSchema = z
  .object({
    mode: z.enum(["url", "text", "image"]),
    url: z.string().trim().url().max(2048).optional(),
    text: z.string().trim().min(10).max(12_000).optional(),
    imageDataUrl: z.string().min(32).max(8_000_000).optional(),
    targetLocale: z.enum(SUPPORTED_LOCALES).default("uk"),
    keepOriginalLanguage: z.boolean().default(false),
  })
  .superRefine((data, ctx) => {
    if (data.mode === "url" && !data.url) {
      ctx.addIssue({ code: "custom", path: ["url"], message: "url_required" });
    }
    if (data.mode === "text" && !data.text) {
      ctx.addIssue({ code: "custom", path: ["text"], message: "text_required" });
    }
    if (data.mode === "image" && !data.imageDataUrl) {
      ctx.addIssue({ code: "custom", path: ["imageDataUrl"], message: "image_required" });
    }
  });

export const aiParsedRecipeSchema = z.object({
  title: z.string().min(1).max(RECIPE_LIMITS.titleMax),
  description: z.string().max(RECIPE_LIMITS.descriptionMax).default(""),
  locale: z.enum(SUPPORTED_LOCALES).default("uk"),
  baseServings: z.number().int().min(1).max(RECIPE_LIMITS.servingsMax).default(4),
  prepTimeMin: z.number().int().min(0).max(1440).default(15),
  cookTimeMin: z.number().int().min(0).max(1440).default(30),
  difficulty: z.enum(RECIPE_DIFFICULTIES).default("medium"),
  categorySlug: z.string().trim().max(60).optional(),
  tags: z.array(z.string().trim().max(40)).max(10).default([]),
  ingredients: z
    .array(
      z.object({
        groupName: z.string().trim().max(60).nullable().optional(),
        name: z.string().trim().min(1).max(RECIPE_LIMITS.ingredientNameMax),
        amount: z.number().positive().max(RECIPE_LIMITS.ingredientAmountMax).nullable().optional(),
        unit: z.enum(INGREDIENT_UNITS).default("pcs"),
        note: z.string().trim().max(120).nullable().optional(),
        isScalable: z.boolean().default(true),
      }),
    )
    .min(1)
    .max(RECIPE_LIMITS.ingredientsMax),
  steps: z
    .array(
      z.object({
        instruction: z.string().trim().min(1).max(RECIPE_LIMITS.stepInstructionMax),
        timerSeconds: z.number().int().min(0).max(86_400).nullable().optional(),
      }),
    )
    .min(1)
    .max(RECIPE_LIMITS.stepsMax),
});

// Keep schema free of length/range constraints so Gemini constrained decoding stays within FSM limits.
export const aiLlmRecipeSchema = z.object({
  title: z.string(),
  description: z.string(),
  locale: z.enum(SUPPORTED_LOCALES),
  baseServings: z.number(),
  prepTimeMin: z.number(),
  cookTimeMin: z.number(),
  difficulty: z.enum(RECIPE_DIFFICULTIES),
  categorySlug: z.string().nullable(),
  tags: z.array(z.string()),
  ingredients: z.array(
    z.object({
      groupName: z.string().nullable(),
      name: z.string(),
      amount: z.number().nullable(),
      unit: z.enum(INGREDIENT_UNITS),
      note: z.string().nullable(),
      isScalable: z.boolean(),
    }),
  ),
  steps: z.array(
    z.object({
      instruction: z.string(),
      timerSeconds: z.number().nullable(),
    }),
  ),
});

export type RecipeIngredientInput = z.infer<typeof recipeIngredientInputSchema>;
export type RecipeStepInput = z.infer<typeof recipeStepInputSchema>;
export type RecipeInput = z.infer<typeof recipeInputSchema>;
export type RecipeFormValues = z.input<typeof recipeInputSchema>;
export type RecipePatchInput = z.infer<typeof recipePatchSchema>;
export type SearchRecipesQuery = z.infer<typeof searchRecipesQuerySchema>;
export type ModerationActionInput = z.infer<typeof moderationActionSchema>;
export type AiImportRequest = z.infer<typeof aiImportRequestSchema>;
export type AiParsedRecipe = z.infer<typeof aiParsedRecipeSchema>;
export type AiLlmRecipeOutput = z.infer<typeof aiLlmRecipeSchema>;

const VALID_CATEGORY_SLUGS = new Set(SEED_CATEGORIES.map((category) => category.slug));

function clampInt(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.round(value)));
}

function trimNullable(value: string | null | undefined, maxLength: number): string | null {
  const trimmed = value?.trim().slice(0, maxLength) ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Clamps and validates raw unconstrained LLM extraction output against strict domain bounds.
 */
export function normalizeAiLlmRecipe(
  raw: AiLlmRecipeOutput,
  fallbackLocale: Locale,
): AiParsedRecipe {
  const categoryCandidate = raw.categorySlug?.trim() ?? "";
  const categorySlug = VALID_CATEGORY_SLUGS.has(categoryCandidate) ? categoryCandidate : undefined;

  const uniqueTags: string[] = [];
  const seenTags = new Set<string>();
  for (const tag of raw.tags) {
    const cleaned = tag.trim().slice(0, 40);
    if (cleaned && !seenTags.has(cleaned)) {
      seenTags.add(cleaned);
      uniqueTags.push(cleaned);
      if (uniqueTags.length >= 10) {
        break;
      }
    }
  }

  const ingredients = raw.ingredients
    .map((item) => {
      const name = item.name.trim().slice(0, RECIPE_LIMITS.ingredientNameMax);
      if (!name) {
        return null;
      }
      const amount =
        typeof item.amount === "number" && Number.isFinite(item.amount) && item.amount > 0
          ? Math.min(RECIPE_LIMITS.ingredientAmountMax, item.amount)
          : null;
      return {
        groupName: trimNullable(item.groupName, 60),
        name,
        amount,
        unit: item.unit,
        note: trimNullable(item.note, 120),
        isScalable: item.unit === "to_taste" ? false : Boolean(item.isScalable),
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .slice(0, RECIPE_LIMITS.ingredientsMax);

  const steps = raw.steps
    .map((step) => {
      const instruction = step.instruction.trim().slice(0, RECIPE_LIMITS.stepInstructionMax);
      if (!instruction) {
        return null;
      }
      const timerSeconds =
        typeof step.timerSeconds === "number" &&
        Number.isFinite(step.timerSeconds) &&
        step.timerSeconds >= 0
          ? Math.min(86_400, Math.round(step.timerSeconds))
          : null;
      return { instruction, timerSeconds };
    })
    .filter((step): step is NonNullable<typeof step> => step !== null)
    .slice(0, RECIPE_LIMITS.stepsMax);

  return aiParsedRecipeSchema.parse({
    title: raw.title.trim().slice(0, RECIPE_LIMITS.titleMax),
    description: raw.description.trim().slice(0, RECIPE_LIMITS.descriptionMax),
    locale: SUPPORTED_LOCALES.includes(raw.locale) ? raw.locale : fallbackLocale,
    baseServings: clampInt(raw.baseServings, 1, RECIPE_LIMITS.servingsMax, 4),
    prepTimeMin: clampInt(raw.prepTimeMin, 0, 1440, 15),
    cookTimeMin: clampInt(raw.cookTimeMin, 0, 1440, 30),
    difficulty: raw.difficulty,
    categorySlug,
    tags: uniqueTags,
    ingredients,
    steps,
  });
}
