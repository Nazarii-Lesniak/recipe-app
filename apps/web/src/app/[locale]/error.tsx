"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { Link } from "@/core/i18n/navigation";
import { Button } from "@/shared/ui";

export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("common");

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex max-w-lg flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <h1 className="font-editorial text-2xl font-bold">{t("errorTitle")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("errorDescription")}</p>
      <div className="mt-6 flex gap-3">
        <Button onClick={reset}>{t("confirm")}</Button>
        <Button variant="outline" asChild>
          <Link href="/">{t("goHome")}</Link>
        </Button>
      </div>
    </main>
  );
}
