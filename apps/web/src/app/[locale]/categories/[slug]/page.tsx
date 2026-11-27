import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/core/i18n/navigation";
import { listCachedPublicRecipes, listCategories } from "@/entities/recipe/server/recipe-service";
import { RecipeCard } from "@/entities/recipe/ui/recipe-card";
import { Button, Card } from "@/shared/ui";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const categories = await listCategories();
  const category = categories.find((c) => c.slug === slug);
  const title = category ? (locale === "uk" ? category.nameUk : category.nameEn) : slug;
  return { title };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const [categories, result, tHome, tSearch] = await Promise.all([
    listCategories(),
    listCachedPublicRecipes({
      category: slug,
      locale: "all",
      difficulty: "all",
      sort: "latest",
      page: 1,
      limit: 24,
    }),
    getTranslations({ locale, namespace: "home" }),
    getTranslations({ locale, namespace: "search" }),
  ]);

  const category = categories.find((c) => c.slug === slug);
  if (!category) {
    notFound();
  }

  const categoryTitle = locale === "uk" ? category.nameUk : category.nameEn;

  return (
    <main className="mx-auto w-full max-w-6xl space-y-8 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-editorial text-3xl font-bold">{categoryTitle}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {tSearch("resultsCount", { count: result.total })}
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/search">{tHome("viewAll")}</Link>
        </Button>
      </div>

      {result.items.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-3 border-dashed p-12 text-center">
          <p className="text-sm text-muted-foreground">{tHome("emptyCatalogDescription")}</p>
          <Button asChild>
            <Link href="/recipes/new">{tHome("heroCreateCta")}</Link>
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {result.items.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      )}
    </main>
  );
}
