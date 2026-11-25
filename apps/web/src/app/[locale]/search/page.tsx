import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { listCategories } from "@/entities/recipe/server/recipe-service";
import { SearchView } from "@/views/search/ui/search-view";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "search" });
  return {
    title: t("title"),
    description: t("subtitle"),
  };
}

export default async function SearchPage() {
  const categories = await listCategories();

  return (
    <Suspense fallback={null}>
      <SearchView categories={categories} />
    </Suspense>
  );
}
