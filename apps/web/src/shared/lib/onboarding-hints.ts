const ONBOARDING_STORAGE_KEY = "recipes_app_dismissed_hints_v1";

export type OnboardingHintId = "portion-scaler" | "fork-recipe" | "ai-import";

export function isHintDismissed(id: OnboardingHintId): boolean {
  if (typeof window === "undefined") {
    return true;
  }
  try {
    const raw = window.localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) && parsed.includes(id);
  } catch {
    return false;
  }
}

export function dismissHint(id: OnboardingHintId): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    const raw = window.localStorage.getItem(ONBOARDING_STORAGE_KEY);
    const current = raw ? (JSON.parse(raw) as unknown) : [];
    const list = Array.isArray(current)
      ? current.filter((item): item is string => typeof item === "string")
      : [];
    if (!list.includes(id)) {
      list.push(id);
      window.localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(list));
    }
  } catch {
    // Ignore localStorage quota/privacy mode errors
  }
}
