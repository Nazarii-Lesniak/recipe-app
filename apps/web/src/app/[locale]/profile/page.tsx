import { redirect } from "next/navigation";
import { getServerSession } from "@/core/auth/session";
import { ProfileView } from "@/views/profile/ui/profile-view";

export const dynamic = "force-dynamic";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await getServerSession();
  if (!session) {
    redirect(`/${locale}/login`);
  }

  return <ProfileView user={session.user} />;
}
