import "@/core/styles/globals.css";
import type { Metadata, Viewport } from "next";
import { Lora, Manrope } from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";
import { routing } from "@/core/i18n/routing";
import { AppProviders } from "@/core/providers/app-providers";
import { Footer } from "@/widgets/footer/ui/footer";
import { Header } from "@/widgets/header/ui/header";

const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  variable: "--font-manrope",
  display: "swap",
});

const lora = Lora({
  subsets: ["latin", "cyrillic"],
  variable: "--font-lora",
  display: "swap",
});

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: "#c0562b",
};

export const metadata: Metadata = {
  title: {
    default: "Смаколик — Домашня кулінарна книга",
    template: "%s | Смаколик",
  },
  description:
    "Домашня кулінарна книга з калькулятором порцій, розумним AI-імпортом та адаптацією рецептів.",
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning className={`${manrope.variable} ${lora.variable}`}>
      <body className="flex min-h-dvh flex-col bg-background text-foreground antialiased">
        <NextIntlClientProvider messages={messages}>
          <AppProviders>
            <Header />
            <div className="flex flex-1 flex-col">{children}</div>
            <Footer />
          </AppProviders>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
