import { relations } from "drizzle-orm";
import { accounts, sessions, users } from "./auth";
import {
  categories,
  moderationLogs,
  recipeCategories,
  recipeIngredients,
  recipeSteps,
  recipes,
  recipeTags,
  savedRecipes,
  tags,
} from "./recipes";

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  accounts: many(accounts),
  recipes: many(recipes),
  savedRecipes: many(savedRecipes),
  moderationLogs: many(moderationLogs),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

export const recipesRelations = relations(recipes, ({ one, many }) => ({
  author: one(users, {
    fields: [recipes.authorId],
    references: [users.id],
  }),
  forkedFrom: one(recipes, {
    fields: [recipes.forkedFromId],
    references: [recipes.id],
    relationName: "recipe_forks",
  }),
  forks: many(recipes, {
    relationName: "recipe_forks",
  }),
  ingredients: many(recipeIngredients),
  steps: many(recipeSteps),
  recipeCategories: many(recipeCategories),
  recipeTags: many(recipeTags),
  savedBy: many(savedRecipes),
  moderationLogs: many(moderationLogs),
}));

export const recipeIngredientsRelations = relations(recipeIngredients, ({ one }) => ({
  recipe: one(recipes, {
    fields: [recipeIngredients.recipeId],
    references: [recipes.id],
  }),
}));

export const recipeStepsRelations = relations(recipeSteps, ({ one }) => ({
  recipe: one(recipes, {
    fields: [recipeSteps.recipeId],
    references: [recipes.id],
  }),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  recipeCategories: many(recipeCategories),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
  recipeTags: many(recipeTags),
}));

export const recipeCategoriesRelations = relations(recipeCategories, ({ one }) => ({
  recipe: one(recipes, {
    fields: [recipeCategories.recipeId],
    references: [recipes.id],
  }),
  category: one(categories, {
    fields: [recipeCategories.categoryId],
    references: [categories.id],
  }),
}));

export const recipeTagsRelations = relations(recipeTags, ({ one }) => ({
  recipe: one(recipes, {
    fields: [recipeTags.recipeId],
    references: [recipes.id],
  }),
  tag: one(tags, {
    fields: [recipeTags.tagId],
    references: [tags.id],
  }),
}));

export const savedRecipesRelations = relations(savedRecipes, ({ one }) => ({
  user: one(users, {
    fields: [savedRecipes.userId],
    references: [users.id],
  }),
  recipe: one(recipes, {
    fields: [savedRecipes.recipeId],
    references: [recipes.id],
  }),
}));

export const moderationLogsRelations = relations(moderationLogs, ({ one }) => ({
  recipe: one(recipes, {
    fields: [moderationLogs.recipeId],
    references: [recipes.id],
  }),
  moderator: one(users, {
    fields: [moderationLogs.moderatorId],
    references: [users.id],
  }),
}));
