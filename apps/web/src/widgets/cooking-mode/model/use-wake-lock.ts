"use client";

import { useEffect, useState } from "react";

export function useWakeLock(active: boolean) {
  const [supported, setSupported] = useState(false);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    const isSupported = typeof navigator !== "undefined" && "wakeLock" in navigator;
    setSupported(isSupported);

    if (!active || !isSupported) {
      setLocked(false);
      return;
    }

    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    const acquire = async () => {
      try {
        sentinel = await navigator.wakeLock.request("screen");
        if (!cancelled) {
          setLocked(true);
        }
        sentinel.addEventListener("release", () => {
          if (!cancelled) {
            setLocked(false);
          }
        });
      } catch {
        if (!cancelled) {
          setLocked(false);
        }
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && active) {
        void acquire();
      }
    };

    void acquire();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (sentinel) {
        void sentinel.release().catch(() => undefined);
      }
      setLocked(false);
    };
  }, [active]);

  return { supported, locked };
}
