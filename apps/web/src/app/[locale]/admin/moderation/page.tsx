import { redirect } from "next/navigation";
import { getServerSession, hasRequiredRole } from "@/core/auth/session";
import { getModerationQueue } from "@/features/moderation/server/moderation-service";
import { AdminModerationView } from "@/views/admin-moderation/ui/admin-moderation-view";

export const dynamic = "force-dynamic";

export default async function AdminModerationPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await getServerSession();

  if (!session) {
    redirect(`/${locale}/login`);
  }

  if (!hasRequiredRole(session.user.role, ["moderator", "admin"])) {
    redirect(`/${locale}`);
  }

  const queue = await getModerationQueue();

  return <AdminModerationView initialQueue={queue} isAdmin={session.user.role === "admin"} />;
}
