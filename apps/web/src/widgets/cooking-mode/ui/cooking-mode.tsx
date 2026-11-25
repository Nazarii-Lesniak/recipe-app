"use client";

import type { ScaledIngredientResult } from "@recipes/domain";
import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw, Sun, Timer, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { RecipeDetailDto } from "@/entities/recipe/server/recipe-service";
import { Badge, Button, Card, Checkbox } from "@/shared/ui";
import { useWakeLock } from "../model/use-wake-lock";

function playCompletionChime() {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.6);
  } catch {
    // Ignore audio context autoplay restrictions
  }
}

function formatClock(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

interface TimerState {
  remaining: number;
  running: boolean;
}

export function CookingMode({
  open,
  onClose,
  recipe,
  scaledIngredients,
  checkedIngredients,
  onToggleIngredient,
}: {
  open: boolean;
  onClose: () => void;
  recipe: RecipeDetailDto;
  scaledIngredients: ScaledIngredientResult[];
  checkedIngredients: Record<string, boolean>;
  onToggleIngredient: (key: string, checked: boolean) => void;
}) {
  const t = useTranslations("cookingMode");
  const tUnits = useTranslations("units");
  const [stepIndex, setStepIndex] = useState(0);
  const [timers, setTimers] = useState<Record<string, TimerState>>({});
  const { supported, locked } = useWakeLock(open);

  useEffect(() => {
    if (!open) return;
    const interval = window.setInterval(() => {
      setTimers((prev) => {
        let changed = false;
        const next: Record<string, TimerState> = {};
        for (const [id, state] of Object.entries(prev)) {
          if (state.running && state.remaining > 0) {
            changed = true;
            const remaining = state.remaining - 1;
            if (remaining === 0) {
              playCompletionChime();
              toast.success(t("timerDone"));
              next[id] = { remaining: 0, running: false };
            } else {
              next[id] = { remaining, running: true };
            }
          } else {
            next[id] = state;
          }
        }
        return changed ? next : prev;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [open, t]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  const currentStep = recipe.steps[stepIndex];
  const currentTimer = currentStep ? timers[currentStep.id] : undefined;
  const stepSeconds = currentStep?.timerSeconds ?? 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("title")}
      className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-background text-foreground"
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <h2 className="font-editorial text-xl font-bold">{recipe.title}</h2>
          <Badge variant={locked ? "accent" : "muted"} className="gap-1">
            <Sun className="h-3.5 w-3.5" />
            <span>{supported && locked ? t("wakeLockActive") : t("wakeLockUnsupported")}</span>
          </Badge>
        </div>

        <Button variant="outline" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
          <span>{t("exit")}</span>
        </Button>
      </header>

      <div className="mx-auto grid w-full max-w-6xl flex-1 gap-6 p-4 sm:p-6 lg:grid-cols-[1fr_1.6fr]">
        <Card className="h-fit space-y-3 p-4">
          <h3 className="font-editorial text-lg font-semibold">{t("checklist")}</h3>
          <ul className="space-y-2.5">
            {scaledIngredients.map((ing, index) => {
              const key = ing.id ?? `cm-${index}`;
              const checked = Boolean(checkedIngredients[key]);
              const unitLabel = tUnits.has(ing.displayUnit)
                ? tUnits(ing.displayUnit as Parameters<typeof tUnits>[0])
                : ing.displayUnit;

              return (
                <li key={key} className="flex items-start gap-2.5 text-sm">
                  <Checkbox
                    id={`cm-ing-${key}`}
                    checked={checked}
                    onCheckedChange={(v) => onToggleIngredient(key, Boolean(v))}
                    className="mt-0.5"
                  />
                  <label
                    htmlFor={`cm-ing-${key}`}
                    className={`cursor-pointer ${checked ? "line-through text-muted-foreground" : ""}`}
                  >
                    <strong className="tabular-nums">
                      {ing.formattedAmount ? `${ing.formattedAmount} ` : ""}
                      {ing.displayUnit === "to_taste" || ing.formattedAmount ? unitLabel : ""}
                    </strong>{" "}
                    {ing.name}
                  </label>
                </li>
              );
            })}
          </ul>
        </Card>

        {currentStep ? (
          <Card className="flex flex-col justify-between gap-6 p-6 sm:p-8">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="tabular-nums">
                  {t("stepProgress", { current: stepIndex + 1, total: recipe.steps.length })}
                </Badge>
              </div>

              <p className="font-editorial text-xl leading-relaxed sm:text-2xl">
                {currentStep.instruction}
              </p>

              {stepSeconds > 0 ? (
                <div className="flex flex-wrap items-center gap-3 rounded-xl bg-muted p-4">
                  <Timer className="h-5 w-5 text-primary" />
                  <span className="text-2xl font-bold tabular-nums">
                    {formatClock(currentTimer ? currentTimer.remaining : stepSeconds)}
                  </span>

                  {!currentTimer ? (
                    <Button
                      size="sm"
                      onClick={() =>
                        setTimers((prev) => ({
                          ...prev,
                          [currentStep.id]: { remaining: stepSeconds, running: true },
                        }))
                      }
                    >
                      <Play className="h-4 w-4" />
                      <span>{t("startTimer", { minutes: Math.ceil(stepSeconds / 60) })}</span>
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setTimers((prev) => ({
                            ...prev,
                            [currentStep.id]: {
                              remaining: currentTimer.remaining,
                              running: !currentTimer.running,
                            },
                          }))
                        }
                      >
                        {currentTimer.running ? (
                          <>
                            <Pause className="h-4 w-4" />
                            <span>{t("pauseTimer")}</span>
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4" />
                            <span>{t("resumeTimer")}</span>
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setTimers((prev) => ({
                            ...prev,
                            [currentStep.id]: { remaining: stepSeconds, running: false },
                          }))
                        }
                      >
                        <RotateCcw className="h-4 w-4" />
                        <span>{t("resetTimer")}</span>
                      </Button>
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            <div className="flex items-center justify-between border-t border-border pt-4">
              <Button
                variant="outline"
                disabled={stepIndex === 0}
                onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
                <span>{t("prevStep")}</span>
              </Button>
              <Button
                disabled={stepIndex >= recipe.steps.length - 1}
                onClick={() => setStepIndex((i) => Math.min(recipe.steps.length - 1, i + 1))}
              >
                <span>{t("nextStep")}</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
