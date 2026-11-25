import {
  type AnyPgColumn,
  boolean,
  index,
  integer,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./auth";
import {
  localeEnum,
  moderationActionEnum,
  moderationStatusEnum,
  recipeDifficultyEnum,
  recipeStatusEnum,
  recipeVisibilityEnum,
} from "./enums";

export const recipes = pgTable(
  "recipes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    authorId: text("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    forkedFromId: uuid("forked_from_id").references((): AnyPgColumn => recipes.id, {
      onDelete: "set null",
    }),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    description: text("description").default("").notNull(),
    coverImageUrl: text("cover_image_url"),
    coverImageKey: text("cover_image_key"),
    baseServings: integer("base_servings").default(4).notNull(),
    prepTimeMin: integer("prep_time_min").default(15).notNull(),
    cookTimeMin: integer("cook_time_min").default(30).notNull(),
    difficulty: recipeDifficultyEnum("difficulty").default("medium").notNull(),
    visibility: recipeVisibilityEnum("visibility").default("public").notNull(),
    status: recipeStatusEnum("status").default("active").notNull(),
    moderationStatus: moderationStatusEnum("moderation_status").default("unreviewed").notNull(),
    moderationNote: text("moderation_note"),
    sourceUrl: text("source_url"),
    locale: localeEnum("locale").default("uk").notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("recipes_author_id_idx").on(table.authorId),
    index("recipes_catalog_idx").on(
      table.visibility,
      table.status,
      table.moderationStatus,
      table.deletedAt,
      table.createdAt,
    ),
    index("recipes_title_trgm_idx").using("gin", table.title.op("gin_trgm_ops")),
    index("recipes_description_trgm_idx").using("gin", table.description.op("gin_trgm_ops")),
  ],
);

export const recipeIngredients = pgTable(
  "recipe_ingredients",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    recipeId: uuid("recipe_id")
      .notNull()
      .references(() => recipes.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull(),
    groupName: text("group_name"),
    name: text("name").notNull(),
    amount: numeric("amount", { precision: 10, scale: 3 }),
    unit: text("unit").default("g").notNull(),
    note: text("note"),
    isScalable: boolean("is_scalable").default(true).notNull(),
  },
  (table) => [
    index("recipe_ingredients_recipe_id_idx").on(table.recipeId),
    index("recipe_ingredients_name_trgm_idx").using("gin", table.name.op("gin_trgm_ops")),
  ],
);

export const recipeSteps = pgTable(
  "recipe_steps",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    recipeId: uuid("recipe_id")
      .notNull()
      .references(() => recipes.id, { onDelete: "cascade" }),
    stepNumber: integer("step_number").notNull(),
    instruction: text("instruction").notNull(),
    timerSeconds: integer("timer_seconds"),
    imageUrl: text("image_url"),
    imageKey: text("image_key"),
  },
  (table) => [index("recipe_steps_recipe_id_idx").on(table.recipeId)],
);

export const categories = pgTable("categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  nameUk: text("name_uk").notNull(),
  nameEn: text("name_en").notNull(),
  icon: text("icon").notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
});

export const tags = pgTable("tags", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
});

export const recipeCategories = pgTable(
  "recipe_categories",
  {
    recipeId: uuid("recipe_id")
      .notNull()
      .references(() => recipes.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.recipeId, table.categoryId] })],
);

export const recipeTags = pgTable(
  "recipe_tags",
  {
    recipeId: uuid("recipe_id")
      .notNull()
      .references(() => recipes.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.recipeId, table.tagId] })],
);

export const savedRecipes = pgTable(
  "saved_recipes",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    recipeId: uuid("recipe_id")
      .notNull()
      .references(() => recipes.id, { onDelete: "cascade" }),
    savedAt: timestamp("saved_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.recipeId] })],
);

export const moderationLogs = pgTable(
  "moderation_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    recipeId: uuid("recipe_id").references(() => recipes.id, { onDelete: "set null" }),
    moderatorId: text("moderator_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    action: moderationActionEnum("action").notNull(),
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("moderation_logs_recipe_id_idx").on(table.recipeId)],
);
