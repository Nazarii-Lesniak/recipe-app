const CYRILLIC_TO_LATIN: Record<string, string> = {
  а: "a",
  б: "b",
  в: "v",
  г: "h",
  ґ: "g",
  д: "d",
  е: "e",
  є: "ye",
  ж: "zh",
  з: "z",
  и: "y",
  і: "i",
  ї: "yi",
  й: "y",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "kh",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "shch",
  ь: "",
  ю: "yu",
  я: "ya",
  ы: "y",
  э: "e",
  ё: "yo",
  ъ: "",
};

export function slugifyRecipeTitle(title: string): string {
  const lower = title.trim().toLowerCase();
  let transliterated = "";
  for (const char of lower) {
    transliterated += CYRILLIC_TO_LATIN[char] ?? char;
  }

  const slug = transliterated
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);

  return slug || "recipe";
}

export function createUniqueSlug(title: string, suffix?: string): string {
  const base = slugifyRecipeTitle(title);
  if (!suffix) {
    const random = Math.random().toString(36).slice(2, 7);
    return `${base}-${random}`;
  }
  const cleanSuffix = suffix
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase()
    .slice(0, 10);
  return cleanSuffix ? `${base}-${cleanSuffix}` : base;
}
