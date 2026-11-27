"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { type LoginInput, loginSchema, type RegisterInput, registerSchema } from "@recipes/domain";
import { useQuery } from "@tanstack/react-query";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { signIn } from "@/core/auth/auth-client";
import { useRouter } from "@/core/i18n/navigation";
import { resolveClientErrorKey } from "@/shared/lib/error-messages";
import { Button, Input, Label } from "@/shared/ui";

function useGoogleEnabled() {
  const { data } = useQuery({
    queryKey: ["auth-capabilities"],
    queryFn: async () => {
      const res = await fetch("/api/v1/auth/capabilities");
      if (!res.ok) return { googleEnabled: false };
      return (await res.json()) as { googleEnabled: boolean };
    },
    staleTime: 5 * 60_000,
  });
  return data?.googleEnabled ?? false;
}

function GoogleOAuthButton({ onSuccess }: { onSuccess?: () => void }) {
  const t = useTranslations("auth");
  const googleEnabled = useGoogleEnabled();
  const [loading, setLoading] = useState(false);

  if (!googleEnabled) {
    return null;
  }

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await signIn.social({
        provider: "google",
        callbackURL: window.location.href,
      });
      onSuccess?.();
    } catch {
      toast.error(t("invalidCredentials"));
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={handleGoogleSignIn}
        disabled={loading}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        <span>{t("continueWithGoogle")}</span>
      </Button>
      <div className="relative my-3 flex items-center justify-center text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        <span className="px-3 uppercase">{t("orDivider")}</span>
        <span className="h-px flex-1 bg-border" />
      </div>
    </>
  );
}

export function LoginForm({
  onSuccess,
  onSwitchToRegister,
}: {
  onSuccess?: () => void;
  onSwitchToRegister?: () => void;
}) {
  const t = useTranslations("auth");
  const tErrors = useTranslations("errors");
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const idPrefix = useId();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    mode: "onTouched",
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (values: LoginInput) => {
    setServerError(null);
    try {
      const result = await signIn.username({
        username: values.username.trim().toLowerCase(),
        password: values.password,
      });

      if (result.error) {
        setServerError(t("invalidCredentials"));
        return;
      }

      router.refresh();
      onSuccess?.();
    } catch {
      setServerError(tErrors("network"));
    }
  };

  const usernameId = `${idPrefix}-login-username`;
  const usernameErrorId = `${idPrefix}-login-username-err`;
  const passwordId = `${idPrefix}-login-password`;
  const passwordErrorId = `${idPrefix}-login-password-err`;

  return (
    <div className="space-y-4">
      <GoogleOAuthButton onSuccess={onSuccess} />
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {serverError ? (
          <div
            role="alert"
            className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {serverError}
          </div>
        ) : null}

        <div className="space-y-1.5">
          <Label htmlFor={usernameId}>{t("usernameLabel")}</Label>
          <Input
            id={usernameId}
            type="text"
            autoComplete="username"
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="none"
            enterKeyHint="next"
            required
            aria-invalid={errors.username ? "true" : "false"}
            aria-describedby={errors.username ? usernameErrorId : undefined}
            {...register("username")}
          />
          {errors.username ? (
            <p id={usernameErrorId} className="text-xs text-destructive">
              {t("usernameHint")}
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={passwordId}>{t("passwordLabel")}</Label>
          <div className="relative">
            <Input
              id={passwordId}
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              enterKeyHint="done"
              required
              className="pr-10"
              aria-invalid={errors.password ? "true" : "false"}
              aria-describedby={errors.password ? passwordErrorId : undefined}
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? t("hidePassword") : t("showPassword")}
              className="absolute inset-y-0 right-2 flex items-center px-1 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password ? (
            <p id={passwordErrorId} className="text-xs text-destructive">
              {t("passwordRules")}
            </p>
          ) : null}
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          <span>{t("loginSubmit")}</span>
        </Button>

        {onSwitchToRegister ? (
          <button
            type="button"
            onClick={onSwitchToRegister}
            className="w-full text-center text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            {t("switchToRegister")}
          </button>
        ) : null}
      </form>
    </div>
  );
}

export function RegisterForm({
  onSuccess,
  onSwitchToLogin,
}: {
  onSuccess?: () => void;
  onSwitchToLogin?: () => void;
}) {
  const t = useTranslations("auth");
  const tErrors = useTranslations("errors");
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const idPrefix = useId();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    mode: "onTouched",
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (values: RegisterInput) => {
    setServerError(null);
    try {
      const res = await fetch("/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string };
        if (payload.error === "username_taken") {
          setServerError(t("usernameTaken"));
        } else {
          setServerError(tErrors(resolveClientErrorKey(payload.error, res.status)));
        }
        return;
      }

      router.refresh();
      onSuccess?.();
    } catch {
      setServerError(tErrors("network"));
    }
  };

  const usernameId = `${idPrefix}-reg-username`;
  const usernameHintId = `${idPrefix}-reg-username-hint`;
  const usernameErrorId = `${idPrefix}-reg-username-err`;
  const passwordId = `${idPrefix}-reg-password`;
  const passwordRulesId = `${idPrefix}-reg-password-rules`;
  const passwordErrorId = `${idPrefix}-reg-password-err`;
  const confirmId = `${idPrefix}-reg-confirm`;
  const confirmErrorId = `${idPrefix}-reg-confirm-err`;

  return (
    <div className="space-y-4">
      <GoogleOAuthButton onSuccess={onSuccess} />
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {serverError ? (
          <div
            role="alert"
            className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {serverError}
          </div>
        ) : null}

        <div className="space-y-1.5">
          <Label htmlFor={usernameId}>{t("usernameLabel")}</Label>
          <p id={usernameHintId} className="text-xs text-muted-foreground">
            {t("usernameHint")}
          </p>
          <Input
            id={usernameId}
            type="text"
            autoComplete="username"
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="none"
            enterKeyHint="next"
            required
            aria-invalid={errors.username ? "true" : "false"}
            aria-describedby={
              errors.username ? `${usernameHintId} ${usernameErrorId}` : usernameHintId
            }
            {...register("username")}
          />
          {errors.username ? (
            <p id={usernameErrorId} className="text-xs text-destructive">
              {t("usernameHint")}
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={passwordId}>{t("passwordLabel")}</Label>
          <p id={passwordRulesId} className="text-xs text-muted-foreground">
            {t("passwordRules")}
          </p>
          <div className="relative">
            <Input
              id={passwordId}
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              enterKeyHint="next"
              minLength={8}
              required
              className="pr-10"
              aria-invalid={errors.password ? "true" : "false"}
              aria-describedby={
                errors.password ? `${passwordRulesId} ${passwordErrorId}` : passwordRulesId
              }
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? t("hidePassword") : t("showPassword")}
              className="absolute inset-y-0 right-2 flex items-center px-1 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password ? (
            <p id={passwordErrorId} className="text-xs text-destructive">
              {t("passwordRules")}
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={confirmId}>{t("confirmPasswordLabel")}</Label>
          <Input
            id={confirmId}
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            enterKeyHint="done"
            minLength={8}
            required
            aria-invalid={errors.confirmPassword ? "true" : "false"}
            aria-describedby={errors.confirmPassword ? confirmErrorId : undefined}
            {...register("confirmPassword")}
          />
          {errors.confirmPassword ? (
            <p id={confirmErrorId} className="text-xs text-destructive">
              {t("passwordRules")}
            </p>
          ) : null}
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          <span>{t("registerSubmit")}</span>
        </Button>

        {onSwitchToLogin ? (
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="w-full text-center text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            {t("switchToLogin")}
          </button>
        ) : null}
      </form>
    </div>
  );
}
