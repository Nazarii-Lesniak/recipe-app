import { notFound } from "next/navigation";
import { getServerSession } from "@/core/auth/session";
import { getRecipeBySlug } from "@/entities/recipe/server/recipe-service";
import { RecipeDetailView } from "@/views/recipe-detail/ui/recipe-detail-view";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await getServerSession();
  const recipe = await getRecipeBySlug(slug, session?.user.id, session?.user.role);
  if (!recipe) {
    return {};
  }

  return {
    title: recipe.title,
    description: recipe.description || recipe.title,
    openGraph: {
      title: recipe.title,
      description: recipe.description || recipe.title,
      images: recipe.coverImageUrl ? [{ url: recipe.coverImageUrl }] : undefined,
    },
  };
}

export default async function RecipeDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await getServerSession();
  const recipe = await getRecipeBySlug(slug, session?.user.id, session?.user.role);

  if (!recipe) {
    notFound();
  }

  return (
    <RecipeDetailView recipe={recipe} viewerId={session?.user.id} viewerRole={session?.user.role} />
  );
}
