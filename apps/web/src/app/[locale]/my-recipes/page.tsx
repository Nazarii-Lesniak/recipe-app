import { redirect } from "next/navigation";
import { getServerSession } from "@/core/auth/session";
import { MyRecipesView } from "@/views/my-recipes/ui/my-recipes-view";

export const dynamic = "force-dynamic";

export default async function MyRecipesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const [{ locale }, query, session] = await Promise.all([
    params,
    searchParams,
    getServerSession(),
  ]);

  if (!session) {
    redirect(`/${locale}/login`);
  }

  const initialTab = query.tab === "saved" || query.tab === "drafts" ? query.tab : "own";

  return <MyRecipesView initialTab={initialTab} />;
}
