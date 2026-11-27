"use client";

import { Check, Copy, ExternalLink, Mail } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui";

const CONTACT_EMAIL = "nazarii.lesniak@gmail.com";
const GITHUB_URL = "https://github.com/Nazarii-Lesniak/recipe-app";

export function ContactView() {
  const t = useTranslations("contact");
  const [copied, setCopied] = useState(false);

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(CONTACT_EMAIL);
      setCopied(true);
      toast.success(t("emailCopied"));
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.location.href = `mailto:${CONTACT_EMAIL}`;
    }
  };

  return (
    <main className="mx-auto w-full max-w-4xl space-y-8 px-4 py-10">
      <div className="space-y-2">
        <h1 className="font-editorial text-3xl font-bold tracking-tight sm:text-4xl">
          {t("title")}
        </h1>
        <p className="text-base text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              <span>{t("emailCardTitle")}</span>
            </CardTitle>
            <CardDescription>{t("emailCardDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="block rounded-lg border border-border bg-muted/50 px-3.5 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:text-primary"
            >
              {CONTACT_EMAIL}
            </a>
            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <a href={`mailto:${CONTACT_EMAIL}`}>
                  <Mail className="h-4 w-4" />
                  <span>{t("sendEmail")}</span>
                </a>
              </Button>
              <Button type="button" variant="outline" onClick={handleCopyEmail}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                <span>{copied ? t("emailCopied") : t("copyEmail")}</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ExternalLink className="h-5 w-5 text-primary" />
              <span>{t("githubCardTitle")}</span>
            </CardTitle>
            <CardDescription>{t("githubCardDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="truncate rounded-lg border border-border bg-muted/50 px-3.5 py-2.5 text-sm text-muted-foreground">
              {GITHUB_URL}
            </p>
            <Button variant="outline" asChild>
              <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
                <span>{t("openGithub")}</span>
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
