import { useTranslations } from "next-intl";
import { Link } from "@/core/i18n/navigation";

export function Footer() {
  const tCommon = useTranslations("common");
  const tNav = useTranslations("nav");

  return (
    <footer className="mt-16 border-t border-border bg-card/60 py-8 text-sm text-muted-foreground">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-4 sm:flex-row sm:items-center">
        <div>
          <p className="font-editorial font-semibold text-foreground">{tCommon("appName")}</p>
          <p className="text-xs">{tCommon("tagline")}</p>
        </div>
        <div className="flex flex-wrap gap-4 text-xs">
          <Link href="/" className="hover:text-foreground">
            {tNav("catalog")}
          </Link>
          <Link href="/search" className="hover:text-foreground">
            {tNav("search")}
          </Link>
          <Link href="/recipes/new" className="hover:text-foreground">
            {tNav("addRecipe")}
          </Link>
          <Link href="/my-recipes" className="hover:text-foreground">
            {tNav("myRecipes")}
          </Link>
        </div>
      </div>
    </footer>
  );
}
