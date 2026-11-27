"use client";

import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/core/i18n/navigation";
import { LoginForm } from "@/features/auth-modal/ui/auth-forms";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui";

export default function LoginPage() {
  const t = useTranslations("auth");
  const router = useRouter();

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 items-center px-4 py-12">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-2xl">{t("loginTitle")}</CardTitle>
          <CardDescription>{t("loginSubtitle")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <LoginForm onSuccess={() => router.push("/")} />
          <div className="text-center text-xs text-muted-foreground">
            <Link
              href="/register"
              className="underline-offset-4 hover:text-foreground hover:underline"
            >
              {t("switchToRegister")}
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
