import { ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/core/i18n/navigation";

const GITHUB_URL = "https://github.com/Nazarii-Lesniak/recipe-app";

export function Footer() {
  const tCommon = useTranslations("common");
  const tNav = useTranslations("nav");
  const tFooter = useTranslations("footer");
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t border-border bg-card/60 py-10 text-sm text-muted-foreground">
      <div className="mx-auto max-w-6xl space-y-8 px-4">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div className="space-y-2">
            <Link
              href="/"
              className="font-editorial text-lg font-bold text-foreground transition-colors hover:text-primary"
            >
              {tCommon("appName")}
            </Link>
            <p className="max-w-xs text-xs leading-relaxed">{tCommon("tagline")}</p>
          </div>

          <div className="space-y-2.5">
            <h2 className="text-xs font-semibold tracking-wider text-foreground uppercase">
              {tFooter("exploreTitle")}
            </h2>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/" className="transition-colors hover:text-foreground">
                  {tFooter("home")}
                </Link>
              </li>
              <li>
                <Link href="/search" className="transition-colors hover:text-foreground">
                  {tNav("search")}
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-2.5">
            <h2 className="text-xs font-semibold tracking-wider text-foreground uppercase">
              {tFooter("accountTitle")}
            </h2>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/my-recipes" className="transition-colors hover:text-foreground">
                  {tNav("myRecipes")}
                </Link>
              </li>
              <li>
                <Link href="/recipes/new" className="transition-colors hover:text-foreground">
                  {tNav("addRecipe")}
                </Link>
              </li>
              <li>
                <Link href="/profile" className="transition-colors hover:text-foreground">
                  {tNav("profile")}
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-2.5">
            <h2 className="text-xs font-semibold tracking-wider text-foreground uppercase">
              {tFooter("projectTitle")}
            </h2>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/about" className="transition-colors hover:text-foreground">
                  {tFooter("about")}
                </Link>
              </li>
              <li>
                <Link href="/contact" className="transition-colors hover:text-foreground">
                  {tFooter("contact")}
                </Link>
              </li>
              <li>
                <a
                  href={GITHUB_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
                >
                  <span>{tFooter("github")}</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border pt-6 text-xs text-muted-foreground">
          <p>{tFooter("copyright", { year })}</p>
        </div>
      </div>
    </footer>
  );
}
