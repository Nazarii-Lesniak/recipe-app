import { getTranslations } from "next-intl/server";
import { listCategories, listPublicRecipes } from "@/entities/recipe/server/recipe-service";
import { HomeView } from "@/views/home/ui/home-view";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "common" });
  return {
    title: t("appName"),
    description: t("tagline"),
  };
}

export default async function HomePage() {
  const [categories, latest, popular] = await Promise.all([
    listCategories(),
    listPublicRecipes({ locale: "all", difficulty: "all", sort: "latest", page: 1, limit: 6 }),
    listPublicRecipes({ locale: "all", difficulty: "all", sort: "popular", page: 1, limit: 6 }),
  ]);

  return (
    <HomeView categories={categories} latestRecipes={latest.items} popularRecipes={popular.items} />
  );
}
