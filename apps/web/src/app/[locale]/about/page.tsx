import { BookOpen, Calculator, ExternalLink, Flame, Sparkles } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/core/i18n/navigation";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@/shared/ui";

const GITHUB_URL = "https://github.com/Nazarii-Lesniak/recipe-app";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "about" });
  return {
    title: t("title"),
    description: t("subtitle"),
  };
}

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "about" });

  const features = [
    { icon: Calculator, text: t("featureScaler") },
    { icon: Sparkles, text: t("featureImport") },
    { icon: Flame, text: t("featureCooking") },
    { icon: BookOpen, text: t("featureCollections") },
  ];

  return (
    <main className="mx-auto w-full max-w-4xl space-y-10 px-4 py-10">
      <section className="space-y-3">
        <h1 className="font-editorial text-3xl font-bold tracking-tight sm:text-4xl">
          {t("title")}
        </h1>
        <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
          {t("subtitle")}
        </p>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>{t("missionTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-muted-foreground">{t("missionText")}</p>
        </CardContent>
      </Card>

      <section className="space-y-4">
        <h2 className="font-editorial text-2xl font-bold">{t("featuresTitle")}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {features.map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.text} className="p-5">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                  <p className="text-sm leading-relaxed text-foreground">{item.text}</p>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      <Card className="flex flex-col justify-between gap-4 p-6 sm:flex-row sm:items-center">
        <div className="space-y-1">
          <h2 className="font-editorial text-xl font-semibold">{t("openSourceTitle")}</h2>
          <p className="text-sm text-muted-foreground">{t("openSourceText")}</p>
        </div>
        <Button variant="outline" asChild className="shrink-0">
          <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
            <span>{t("openSourceCta")}</span>
            <ExternalLink className="h-4 w-4" />
          </a>
        </Button>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/search">{t("exploreCta")}</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/contact">{t("contactCta")}</Link>
        </Button>
      </div>
    </main>
  );
}
