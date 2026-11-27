"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  type ProfileUpdateInput,
  profileUpdateSchema,
  SUPPORTED_LOCALES,
  SUPPORTED_THEMES,
  UNIT_SYSTEMS,
} from "@recipes/domain";
import { Download, Loader2, ShieldAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useId } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import type { SessionUser } from "@/core/auth/session";
import { Link, usePathname, useRouter } from "@/core/i18n/navigation";
import { useServingsStore } from "@/features/scale-servings/model/use-servings-store";
import { resolveClientErrorKey } from "@/shared/lib/error-messages";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui";

export function ProfileView({ user }: { user: SessionUser }) {
  const t = useTranslations("profile");
  const tAuth = useTranslations("auth");
  const tThemes = useTranslations("themes");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("errors");
  const { setTheme } = useTheme();
  const setUnitSystem = useServingsStore((s) => s.setUnitSystem);
  const router = useRouter();
  const pathname = usePathname();
  const idPrefix = useId();

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileUpdateInput>({
    mode: "onTouched",
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: {
      username: user.username,
      displayName: user.displayName ?? user.name,
      preferredLocale: user.preferredLocale,
      preferredTheme: user.preferredTheme,
      preferredUnits: user.preferredUnits,
    },
  });

  const onSubmit = async (values: ProfileUpdateInput) => {
    try {
      const res = await fetch("/api/v1/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string };
        if (payload.error === "username_taken") {
          toast.error(tAuth("usernameTaken"));
        } else {
          toast.error(tErrors(resolveClientErrorKey(payload.error, res.status)));
        }
        return;
      }

      if (values.preferredTheme) {
        setTheme(values.preferredTheme);
      }
      if (values.preferredUnits) {
        setUnitSystem(values.preferredUnits);
      }
      toast.success(t("saveSuccess"));

      if (values.preferredLocale) {
        router.replace(pathname, { locale: values.preferredLocale });
      } else {
        router.refresh();
      }
    } catch {
      toast.error(tErrors("network"));
    }
  };

  const isModerator = user.role === "moderator" || user.role === "admin";
  const usernameId = `${idPrefix}-username`;
  const displayNameId = `${idPrefix}-display-name`;

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-editorial text-3xl font-bold">{t("title")}</h1>
        {isModerator ? (
          <Button variant="outline" asChild>
            <Link href="/admin/moderation">
              <ShieldAlert className="h-4 w-4 text-primary" />
              <span>{t("adminLink")}</span>
            </Link>
          </Button>
        ) : null}
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor={usernameId}>{t("usernameLabel")}</Label>
              <Input
                id={usernameId}
                type="text"
                spellCheck={false}
                autoCorrect="off"
                autoCapitalize="none"
                aria-invalid={errors.username ? "true" : "false"}
                {...register("username")}
              />
              {errors.username ? (
                <p className="text-xs text-destructive">{tAuth("usernameHint")}</p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={displayNameId}>{t("displayNameLabel")}</Label>
              <Input id={displayNameId} type="text" {...register("displayName")} />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>{t("localeLabel")}</Label>
                <Controller
                  control={control}
                  name="preferredLocale"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SUPPORTED_LOCALES.map((loc) => (
                          <SelectItem key={loc} value={loc}>
                            {loc === "uk" ? "Українська" : "English"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="space-y-1.5">
                <Label>{t("themeLabel")}</Label>
                <Controller
                  control={control}
                  name="preferredTheme"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SUPPORTED_THEMES.map((item) => (
                          <SelectItem key={item} value={item}>
                            {tThemes(item)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="space-y-1.5">
                <Label>{t("unitsLabel")}</Label>
                <Controller
                  control={control}
                  name="preferredUnits"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {UNIT_SYSTEMS.map((unit) => (
                          <SelectItem key={unit} value={unit}>
                            {unit === "metric" ? t("metric") : t("imperial")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              <span>{tCommon("save")}</span>
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("exportTitle")}</CardTitle>
          <CardDescription>{t("exportDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" asChild>
            <a href="/api/v1/profile/export" download>
              <Download className="h-4 w-4" />
              <span>{t("exportButton")}</span>
            </a>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
