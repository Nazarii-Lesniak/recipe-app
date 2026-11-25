import { listCategories } from "@/entities/recipe/server/recipe-service";
import { NewRecipeView } from "@/views/recipe-editor/ui/new-recipe-view";

export const dynamic = "force-dynamic";

export default async function NewRecipePage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string; text?: string; title?: string }>;
}) {
  const [categories, query] = await Promise.all([listCategories(), searchParams]);
  const sharedText = [query.title, query.text].filter(Boolean).join("\n");

  return (
    <NewRecipeView
      categories={categories}
      initialSharedUrl={query.url}
      initialSharedText={sharedText || undefined}
    />
  );
}
