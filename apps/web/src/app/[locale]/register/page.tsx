"use client";

import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/core/i18n/navigation";
import { RegisterForm } from "@/features/auth-modal/ui/auth-forms";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui";

export default function RegisterPage() {
  const t = useTranslations("auth");
  const router = useRouter();

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 items-center px-4 py-12">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-2xl">{t("registerTitle")}</CardTitle>
          <CardDescription>{t("registerSubtitle")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RegisterForm onSuccess={() => router.push("/")} />
          <div className="text-center text-xs text-muted-foreground">
            <Link href="/login" className="underline-offset-4 hover:text-foreground hover:underline">
              {t("switchToLogin")}
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
