import { SEED_CATEGORIES } from "@recipes/domain";
import type { MetadataRoute } from "next";
import { env } from "@/core/env";
import { listPublishedSlugsForSitemap } from "@/entities/recipe/server/recipe-service";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = env.NEXT_PUBLIC_APP_URL ?? env.BETTER_AUTH_URL ?? "http://localhost:3000";
  const now = new Date();

  const entries: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/uk`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/en`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/uk/search`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${baseUrl}/en/search`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${baseUrl}/uk/about`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/en/about`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/uk/contact`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/en/contact`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
  ];

  for (const cat of SEED_CATEGORIES) {
    entries.push(
      {
        url: `${baseUrl}/uk/categories/${cat.slug}`,
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.7,
      },
      {
        url: `${baseUrl}/en/categories/${cat.slug}`,
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.7,
      },
    );
  }

  const recipes = await listPublishedSlugsForSitemap();
  for (const recipe of recipes) {
    entries.push(
      {
        url: `${baseUrl}/uk/recipes/${recipe.slug}`,
        lastModified: recipe.updatedAt,
        changeFrequency: "weekly",
        priority: 0.8,
      },
      {
        url: `${baseUrl}/en/recipes/${recipe.slug}`,
        lastModified: recipe.updatedAt,
        changeFrequency: "weekly",
        priority: 0.8,
      },
    );
  }

  return entries;
}
