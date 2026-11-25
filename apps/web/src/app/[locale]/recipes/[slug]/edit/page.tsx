import { notFound, redirect } from "next/navigation";
import { getServerSession } from "@/core/auth/session";
import { getRecipeByIdForEdit } from "@/entities/recipe/server/recipe-mutations";
import { listCategories } from "@/entities/recipe/server/recipe-service";
import { EditRecipeView } from "@/views/recipe-editor/ui/edit-recipe-view";

export const dynamic = "force-dynamic";

export default async function EditRecipePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const session = await getServerSession();
  if (!session) {
    redirect(`/${locale}/login`);
  }

  const [recipe, categories] = await Promise.all([
    getRecipeByIdForEdit(slug, session.user.id, session.user.role).catch(() => null),
    listCategories(),
  ]);

  if (!recipe) {
    notFound();
  }

  return <EditRecipeView categories={categories} recipe={recipe} />;
}
