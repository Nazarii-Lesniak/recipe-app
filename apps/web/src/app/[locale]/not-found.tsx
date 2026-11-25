import { useTranslations } from "next-intl";
import { Link } from "@/core/i18n/navigation";
import { Button } from "@/shared/ui";

export default function LocaleNotFound() {
  const t = useTranslations("common");

  return (
    <main className="mx-auto flex max-w-lg flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <h1 className="font-editorial text-3xl font-bold">{t("notFoundTitle")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("notFoundDescription")}</p>
      <Button className="mt-6" asChild>
        <Link href="/">{t("goHome")}</Link>
      </Button>
    </main>
  );
}
