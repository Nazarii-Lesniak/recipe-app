"use client";

import type { RecipeInput } from "@recipes/domain";
import { useCallback, useEffect, useState } from "react";

export interface SavedDraftEnvelope {
  savedAt: string;
  data: Partial<RecipeInput>;
}

export function buildDraftStorageKey(scopeKey: string): string {
  return `recipes_app_draft_v1_${scopeKey}`;
}

export function readStoredDraft(scopeKey: string): SavedDraftEnvelope | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(buildDraftStorageKey(scopeKey));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedDraftEnvelope;
    if (parsed && typeof parsed === "object" && parsed.data && typeof parsed.savedAt === "string") {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function writeStoredDraft(scopeKey: string, data: Partial<RecipeInput>): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    const envelope: SavedDraftEnvelope = {
      savedAt: new Date().toISOString(),
      data,
    };
    window.localStorage.setItem(buildDraftStorageKey(scopeKey), JSON.stringify(envelope));
  } catch {
    // Ignore localStorage quota/private mode failures
  }
}

export function clearStoredDraft(scopeKey: string): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.removeItem(buildDraftStorageKey(scopeKey));
  } catch {
    // Ignore
  }
}

export function useRecipeDraftAutosave({
  scopeKey,
  currentValues,
  isDirty,
}: {
  scopeKey: string;
  currentValues: Partial<RecipeInput>;
  isDirty: boolean;
}) {
  const [pendingDraft, setPendingDraft] = useState<SavedDraftEnvelope | null>(null);
  const [lastAutosavedAt, setLastAutosavedAt] = useState<string | null>(null);

  useEffect(() => {
    const existing = readStoredDraft(scopeKey);
    if (existing) {
      setPendingDraft(existing);
    }
  }, [scopeKey]);

  useEffect(() => {
    if (!isDirty) {
      return;
    }
    const timer = window.setTimeout(() => {
      writeStoredDraft(scopeKey, currentValues);
      setLastAutosavedAt(new Date().toLocaleTimeString());
    }, 2000);

    return () => window.clearTimeout(timer);
  }, [scopeKey, currentValues, isDirty]);

  const dismissPendingDraft = useCallback(() => {
    clearStoredDraft(scopeKey);
    setPendingDraft(null);
  }, [scopeKey]);

  const consumePendingDraft = useCallback((): Partial<RecipeInput> | null => {
    const data = pendingDraft?.data ?? null;
    setPendingDraft(null);
    return data;
  }, [pendingDraft]);

  return {
    pendingDraft,
    lastAutosavedAt,
    dismissPendingDraft,
    consumePendingDraft,
    clearDraft: () => clearStoredDraft(scopeKey),
  };
}
