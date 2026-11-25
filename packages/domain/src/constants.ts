export const SUPPORTED_LOCALES = ["uk", "en"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "uk";

export const SUPPORTED_THEMES = [
  "warm-kitchen",
  "dark-espresso",
  "fresh-matcha",
  "system",
] as const;
export type ThemePreference = (typeof SUPPORTED_THEMES)[number];

export const UNIT_SYSTEMS = ["metric", "imperial"] as const;
export type UnitSystem = (typeof UNIT_SYSTEMS)[number];

export const USER_ROLES = ["user", "moderator", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const RECIPE_DIFFICULTIES = ["easy", "medium", "hard"] as const;
export type RecipeDifficulty = (typeof RECIPE_DIFFICULTIES)[number];

export const RECIPE_VISIBILITIES = ["public", "private"] as const;
export type RecipeVisibility = (typeof RECIPE_VISIBILITIES)[number];

export const RECIPE_STATUSES = ["draft", "active"] as const;
export type RecipeStatus = (typeof RECIPE_STATUSES)[number];

export const MODERATION_STATUSES = ["unreviewed", "approved", "hidden"] as const;
export type ModerationStatus = (typeof MODERATION_STATUSES)[number];

export const MODERATION_ACTIONS = [
  "approved",
  "hidden",
  "restored",
  "hard_deleted",
] as const;
export type ModerationAction = (typeof MODERATION_ACTIONS)[number];

export const INGREDIENT_UNITS = [
  "g",
  "kg",
  "ml",
  "l",
  "tsp",
  "tbsp",
  "cup",
  "pcs",
  "pinch",
  "to_taste",
] as const;
export type IngredientUnit = (typeof INGREDIENT_UNITS)[number];

export interface SeedCategory {
  slug: string;
  nameUk: string;
  nameEn: string;
  icon: string;
  sortOrder: number;
}

export const SEED_CATEGORIES: readonly SeedCategory[] = [
  { slug: "breakfasts", nameUk: "Сніданки", nameEn: "Breakfasts", icon: "sunrise", sortOrder: 1 },
  { slug: "soups", nameUk: "Супи", nameEn: "Soups", icon: "soup", sortOrder: 2 },
  { slug: "mains", nameUk: "Основні страви", nameEn: "Main Dishes", icon: "utensils", sortOrder: 3 },
  { slug: "salads", nameUk: "Салати", nameEn: "Salads", icon: "salad", sortOrder: 4 },
  { slug: "baking", nameUk: "Випічка", nameEn: "Baking", icon: "croissant", sortOrder: 5 },
  { slug: "desserts", nameUk: "Десерти", nameEn: "Desserts", icon: "cake-slice", sortOrder: 6 },
  { slug: "appetizers", nameUk: "Закуски", nameEn: "Appetizers", icon: "sandwich", sortOrder: 7 },
  { slug: "drinks", nameUk: "Напої", nameEn: "Drinks", icon: "cup-soda", sortOrder: 8 },
  { slug: "sauces", nameUk: "Соуси", nameEn: "Sauces", icon: "droplets", sortOrder: 9 },
] as const;

export const RECIPE_LIMITS = {
  titleMin: 3,
  titleMax: 120,
  descriptionMax: 1000,
  ingredientsMin: 1,
  ingredientsMax: 60,
  ingredientNameMax: 120,
  ingredientAmountMax: 100_000,
  stepsMin: 1,
  stepsMax: 50,
  stepInstructionMax: 1500,
  servingsMin: 1,
  servingsMax: 100,
  scaleServingsMin: 1,
  scaleServingsMax: 50,
  maxImageBytes: 5 * 1024 * 1024,
} as const;

export const ACCEPTED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
] as const;
