import { pgEnum } from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["user", "moderator", "admin"]);
export const recipeDifficultyEnum = pgEnum("recipe_difficulty", ["easy", "medium", "hard"]);
export const recipeVisibilityEnum = pgEnum("recipe_visibility", ["public", "private"]);
export const recipeStatusEnum = pgEnum("recipe_status", ["draft", "active"]);
export const moderationStatusEnum = pgEnum("moderation_status", [
  "unreviewed",
  "approved",
  "hidden",
]);
export const moderationActionEnum = pgEnum("moderation_action", [
  "approved",
  "hidden",
  "restored",
  "hard_deleted",
]);
export const localeEnum = pgEnum("app_locale", ["uk", "en"]);
export const themeEnum = pgEnum("app_theme", [
  "warm-kitchen",
  "dark-espresso",
  "fresh-matcha",
  "system",
]);
export const unitSystemEnum = pgEnum("unit_system", ["metric", "imperial"]);
