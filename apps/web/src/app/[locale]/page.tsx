import { useTranslations } from "next-intl";

export default function HomePage() {
  const t = useTranslations("home");

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-12">
      <h1 className="font-editorial text-3xl font-bold">{t("heroTitle")}</h1>
      <p className="mt-3 text-muted-foreground">{t("heroSubtitle")}</p>
    </main>
  );
}
