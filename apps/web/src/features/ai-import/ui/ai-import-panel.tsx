"use client";

import type { AiParsedRecipe, RecipeInput } from "@recipes/domain";
import { FileText, Image as ImageIcon, Link2, Loader2, Sparkles } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { type ChangeEvent, useState } from "react";
import { toast } from "sonner";
import { useAuthModalStore } from "@/features/auth-modal/model/use-auth-modal-store";
import {
  Button,
  Card,
  Checkbox,
  Input,
  Label,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
} from "@/shared/ui";
import { OnboardingHint } from "@/shared/ui/onboarding-hint";

export function AiImportPanel({
  initialUrl,
  initialText,
  onParsed,
}: {
  initialUrl?: string;
  initialText?: string;
  onParsed: (data: Partial<RecipeInput>, duplicateWarning: boolean) => void;
}) {
  const t = useTranslations("aiImport");
  const tAuth = useTranslations("auth");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const openLogin = useAuthModalStore((s) => s.openLogin);

  const [mode, setMode] = useState<"url" | "text" | "image">(
    initialUrl ? "url" : initialText ? "text" : "url",
  );
  const [url, setUrl] = useState(initialUrl ?? "");
  const [text, setText] = useState(initialText ?? "");
  const [imageDataUrl, setImageDataUrl] = useState<string>("");
  const [keepOriginalLanguage, setKeepOriginalLanguage] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleImageSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setImageDataUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleImport = async () => {
    setLoading(true);
    try {
      const payload = {
        mode,
        url: mode === "url" ? url.trim() : undefined,
        text: mode === "text" ? text.trim() : undefined,
        imageDataUrl: mode === "image" ? imageDataUrl : undefined,
        targetLocale: locale === "en" ? "en" : "uk",
        keepOriginalLanguage,
      };

      const res = await fetch("/api/v1/ai/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.status === 401) {
        openLogin(tAuth("authRequiredForAction"));
        return;
      }

      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        const errorKeyMap = {
          ai_not_configured: "notConfigured",
          url_fetch_failed: "errorUrlFetchFailed",
          empty_page_content: "errorEmptyPage",
          unsafe_external_url: "errorUnsafeUrl",
          invalid_image_data_url: "errorInvalidImage",
          ai_rate_limited: "errorRateLimited",
          ai_temporarily_unavailable: "errorTemporarilyUnavailable",
          ai_auth_error: "errorAuth",
          ai_model_not_found: "errorModelNotFound",
          ai_parse_failed: "errorParseFailed",
          ai_request_rejected: "errorRequestRejected",
        } as const;

        const messageKey =
          err.error && err.error in errorKeyMap
            ? errorKeyMap[err.error as keyof typeof errorKeyMap]
            : null;
        toast.error(messageKey ? t(messageKey) : tCommon("errorTitle"));
        return;
      }

      const result = (await res.json()) as {
        recipe: AiParsedRecipe;
        source: "json-ld" | "llm";
        duplicateWarning: boolean;
      };

      toast.success(result.source === "json-ld" ? t("successJsonLd") : t("successLlm"));

      onParsed(
        {
          title: result.recipe.title,
          description: result.recipe.description,
          locale: result.recipe.locale,
          baseServings: result.recipe.baseServings,
          prepTimeMin: result.recipe.prepTimeMin,
          cookTimeMin: result.recipe.cookTimeMin,
          difficulty: result.recipe.difficulty,
          categorySlugs: result.recipe.categorySlug ? [result.recipe.categorySlug] : [],
          tags: result.recipe.tags,
          sourceUrl: mode === "url" ? url.trim() : null,
          ingredients: result.recipe.ingredients.map((i) => ({
            groupName: i.groupName ?? null,
            name: i.name,
            amount: i.amount ?? null,
            unit: i.unit,
            note: i.note ?? null,
            isScalable: i.isScalable,
          })),
          steps: result.recipe.steps.map((s) => ({
            instruction: s.instruction,
            timerSeconds: s.timerSeconds ?? null,
            imageUrl: null,
            imageKey: null,
          })),
        },
        result.duplicateWarning,
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="space-y-5 p-5">
      <OnboardingHint hintId="ai-import" text={t("hint")} />

      <Tabs value={mode} onValueChange={(v) => setMode(v as "url" | "text" | "image")}>
        <TabsList>
          <TabsTrigger value="url" className="gap-1.5">
            <Link2 className="h-3.5 w-3.5" />
            <span>{t("modeUrl")}</span>
          </TabsTrigger>
          <TabsTrigger value="text" className="gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            <span>{t("modeText")}</span>
          </TabsTrigger>
          <TabsTrigger value="image" className="gap-1.5">
            <ImageIcon className="h-3.5 w-3.5" />
            <span>{t("modeImage")}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="url">
          <Input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={t("urlPlaceholder")}
          />
        </TabsContent>

        <TabsContent value="text">
          <Textarea
            rows={6}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t("textPlaceholder")}
          />
        </TabsContent>

        <TabsContent value="image" className="space-y-2">
          <Label htmlFor="ai-screenshot-input">{t("imagePrompt")}</Label>
          <Input
            id="ai-screenshot-input"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleImageSelect}
          />
        </TabsContent>
      </Tabs>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <Checkbox
            checked={keepOriginalLanguage}
            onCheckedChange={(checked) => setKeepOriginalLanguage(Boolean(checked))}
          />
          <span>{t("keepOriginal")}</span>
        </label>

        <Button type="button" onClick={handleImport} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          <span>{loading ? t("parsing") : t("submit")}</span>
        </Button>
      </div>
    </Card>
  );
}
