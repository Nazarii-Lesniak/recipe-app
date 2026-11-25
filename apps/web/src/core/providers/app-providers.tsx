"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WifiOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { ThemeProvider } from "next-themes";
import { type ReactNode, useEffect, useState } from "react";
import { Toaster } from "sonner";
import { AuthModal } from "@/features/auth-modal/ui/auth-modal";
import { TooltipProvider } from "@/shared/ui";

function OfflineBanner() {
  const t = useTranslations("common");
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    setIsOffline(!navigator.onLine);
    const onOffline = () => setIsOffline(true);
    const onOnline = () => setIsOffline(false);
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  if (!isOffline) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center justify-center gap-2 bg-destructive px-4 py-2 text-xs font-medium text-destructive-foreground"
    >
      <WifiOff className="h-3.5 w-3.5" />
      <span>{t("offlineBanner")}</span>
    </div>
  );
}

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
          },
        },
      }),
  );

  return (
    <ThemeProvider
      attribute="data-theme"
      defaultTheme="warm-kitchen"
      enableSystem
      themes={["warm-kitchen", "dark-espresso", "fresh-matcha"]}
      value={{
        "warm-kitchen": "warm-kitchen",
        "dark-espresso": "dark-espresso",
        "fresh-matcha": "fresh-matcha",
        light: "warm-kitchen",
        dark: "dark-espresso",
      }}
    >
      <QueryClientProvider client={queryClient}>
        <TooltipProvider delayDuration={200}>
          <OfflineBanner />
          {children}
          <AuthModal />
          <Toaster richColors position="bottom-right" />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
