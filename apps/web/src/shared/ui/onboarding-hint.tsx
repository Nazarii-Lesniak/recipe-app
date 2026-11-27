"use client";

import { HelpCircle, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { dismissHint, isHintDismissed, type OnboardingHintId } from "@/shared/lib/onboarding-hints";

export function OnboardingHint({ hintId, text }: { hintId: OnboardingHintId; text: string }) {
  const t = useTranslations("common");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isHintDismissed(hintId)) {
      setVisible(true);
    }
  }, [hintId]);

  if (!visible) {
    return null;
  }

  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-primary/25 bg-primary/8 px-3.5 py-2.5 text-xs text-foreground">
      <div className="flex items-start gap-2">
        <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p className="leading-relaxed">{text}</p>
      </div>
      <button
        type="button"
        onClick={() => {
          dismissHint(hintId);
          setVisible(false);
        }}
        aria-label={t("dismissHint")}
        className="shrink-0 rounded-sm p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
