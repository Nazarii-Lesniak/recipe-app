"use client";

import { SUPPORTED_THEMES, type ThemePreference } from "@recipes/domain";
import { useQuery } from "@tanstack/react-query";
import {
  BookMarked,
  Check,
  ChefHat,
  Globe,
  LogOut,
  Palette,
  Plus,
  Search,
  ShieldAlert,
  User,
  UtensilsCrossed,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { signOut, useSession } from "@/core/auth/auth-client";
import { Link, usePathname, useRouter } from "@/core/i18n/navigation";
import { useAuthModalStore } from "@/features/auth-modal/model/use-auth-modal-store";
import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui";

export function Header({ initialModerationCount = 0 }: { initialModerationCount?: number }) {
  const tNav = useTranslations("nav");
  const tCommon = useTranslations("common");
  const tThemes = useTranslations("themes");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { data: session } = useSession();
  const { openLogin, openRegister } = useAuthModalStore();

  const user = session?.user as
    | {
        id: string;
        name: string;
        username?: string;
        role?: string;
      }
    | undefined;

  const isModerator = user?.role === "moderator" || user?.role === "admin";

  const { data: modCountData } = useQuery({
    queryKey: ["moderation-count"],
    enabled: isModerator,
    initialData: { count: initialModerationCount },
    queryFn: async () => {
      const res = await fetch("/api/v1/moderation/queue");
      if (!res.ok) return { count: 0 };
      const json = (await res.json()) as { items?: unknown[] };
      return { count: json.items?.length ?? 0 };
    },
    staleTime: 60_000,
  });

  const switchLocale = (nextLocale: "uk" | "en") => {
    router.replace(pathname, { locale: nextLocale });
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="flex items-center gap-2 font-editorial text-xl font-bold text-foreground"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <UtensilsCrossed className="h-5 w-5" />
            </span>
            <span>{tCommon("appName")}</span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/">{tNav("catalog")}</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/search" className="gap-1.5">
                <Search className="h-4 w-4" />
                {tNav("search")}
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/my-recipes" className="gap-1.5">
                <BookMarked className="h-4 w-4" />
                {tNav("myRecipes")}
              </Link>
            </Button>
            {isModerator ? (
              <Button variant="ghost" size="sm" asChild>
                <Link href="/admin/moderation" className="gap-1.5">
                  <ShieldAlert className="h-4 w-4 text-primary" />
                  {tNav("moderation")}
                  {(modCountData?.count ?? 0) > 0 ? (
                    <Badge
                      variant="default"
                      className="ml-0.5 px-1.5 py-0 text-[10px] tabular-nums"
                    >
                      {modCountData?.count}
                    </Badge>
                  ) : null}
                </Link>
              </Button>
            ) : null}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="default" className="hidden sm:inline-flex" asChild>
            <Link href="/recipes/new">
              <Plus className="h-4 w-4" />
              <span>{tNav("addRecipe")}</span>
            </Link>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                aria-label={tNav("theme")}
                data-testid="theme-switcher"
              >
                <Palette className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {SUPPORTED_THEMES.map((item: ThemePreference) => (
                <DropdownMenuItem
                  key={item}
                  onClick={() => setTheme(item)}
                  data-testid={`theme-${item}`}
                >
                  <Check className={`h-4 w-4 ${theme === item ? "opacity-100" : "opacity-0"}`} />
                  <span>{tThemes(item)}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                aria-label={tNav("language")}
                data-testid="locale-switcher"
              >
                <Globe className="h-4 w-4" />
                <span className="uppercase">{locale}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => switchLocale("uk")}>
                <Check className={`h-4 w-4 ${locale === "uk" ? "opacity-100" : "opacity-0"}`} />
                <span>Українська (UK)</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => switchLocale("en")}>
                <Check className={`h-4 w-4 ${locale === "en" ? "opacity-100" : "opacity-0"}`} />
                <span>English (EN)</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="sm" className="gap-1.5">
                  <ChefHat className="h-4 w-4" />
                  <span className="max-w-28 truncate">@{user.username ?? user.name}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href="/my-recipes" className="w-full">
                    <BookMarked className="h-4 w-4" />
                    <span>{tNav("myRecipes")}</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/recipes/new" className="w-full">
                    <Plus className="h-4 w-4" />
                    <span>{tNav("addRecipe")}</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="w-full">
                    <User className="h-4 w-4" />
                    <span>{tNav("profile")}</span>
                  </Link>
                </DropdownMenuItem>
                {isModerator ? (
                  <DropdownMenuItem asChild>
                    <Link href="/admin/moderation" className="w-full">
                      <ShieldAlert className="h-4 w-4" />
                      <span>{tNav("moderation")}</span>
                    </Link>
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={async () => {
                    await signOut();
                    router.refresh();
                  }}
                >
                  <LogOut className="h-4 w-4" />
                  <span>{tNav("signOut")}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-1.5">
              <Button variant="ghost" size="sm" onClick={() => openLogin()}>
                {tNav("signIn")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="hidden sm:inline-flex"
                onClick={() => openRegister()}
              >
                {tNav("signUp")}
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
