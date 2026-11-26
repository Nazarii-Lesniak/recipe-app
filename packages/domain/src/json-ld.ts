import type { IngredientUnit, Locale } from "./constants";
import type { AiParsedRecipe } from "./schemas/recipe";

function isPrivateIpv4(host: string): boolean {
  const parts = host.split(".");
  if (parts.length !== 4 || parts.some((p) => !/^\d+$/.test(p))) {
    return false;
  }
  const octets = parts.map(Number);
  const [a, b] = octets;
  if (a === undefined || b === undefined || octets.some((o) => o < 0 || o > 255)) {
    return true;
  }
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  return false;
}

export function isSafeExternalUrl(rawUrl: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return false;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return false;
  }

  if (parsed.username || parsed.password) {
    return false;
  }

  const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!host) {
    return false;
  }

  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal")
  ) {
    return false;
  }

  // Block integer/hex/octal obfuscated IP hosts (no dots or hex prefix)
  if (/^(0x[0-9a-f]+|\d+)$/i.test(host)) {
    return false;
  }

  if (isPrivateIpv4(host)) {
    return false;
  }

  // Block IPv6 loopback, link-local, unique-local, IPv4-mapped
  if (host.includes(":")) {
    if (
      host === "::1" ||
      host === "::" ||
      host.startsWith("fe80:") ||
      host.startsWith("fc") ||
      host.startsWith("fd") ||
      host.startsWith("::ffff:")
    ) {
      return false;
    }
  }

  return true;
}

export function parseIsoDurationMinutes(iso?: string | null): number | null {
  if (!iso || typeof iso !== "string") {
    return null;
  }
  const match = iso.trim().match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/i);
  if (!match) {
    return null;
  }
  const days = Number(match[1] ?? 0);
  const hours = Number(match[2] ?? 0);
  const minutes = Number(match[3] ?? 0);
  const seconds = Number(match[4] ?? 0);
  const total = days * 1440 + hours * 60 + minutes + Math.round(seconds / 60);
  return total > 0 ? Math.min(total, 1440) : null;
}

function isRecipeType(typeValue: unknown): boolean {
  if (typeof typeValue === "string") {
    return typeValue.toLowerCase().includes("recipe");
  }
  if (Array.isArray(typeValue)) {
    return typeValue.some((item) => typeof item === "string" && item.toLowerCase().includes("recipe"));
  }
  return false;
}

function findRecipeNode(node: unknown): Record<string, unknown> | null {
  if (!node || typeof node !== "object") {
    return null;
  }

  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findRecipeNode(item);
      if (found) return found;
    }
    return null;
  }

  const record = node as Record<string, unknown>;
  if (isRecipeType(record["@type"])) {
    return record;
  }

  if (Array.isArray(record["@graph"])) {
    const found = findRecipeNode(record["@graph"]);
    if (found) return found;
  }

  return null;
}

const UNIT_ALIASES: ReadonlyArray<[RegExp, IngredientUnit]> = [
  [/^(г|гр|грам|грами|грамів|g|gram|grams)\.?$/i, "g"],
  [/^(кг|кілограм|кілограми|kg|kilogram|kilograms)\.?$/i, "kg"],
  [/^(мл|мілілітр|мілілітри|ml|milliliter|milliliters)\.?$/i, "ml"],
  [/^(л|літр|літри|l|liter|liters)\.?$/i, "l"],
  [/^(ч\.?\s*л\.?|tsp|teaspoon|teaspoons)\.?$/i, "tsp"],
  [/^(ст\.?\s*л\.?|tbsp|tablespoon|tablespoons)\.?$/i, "tbsp"],
  [/^(скл\.?|склянка|склянки|cup|cups)\.?$/i, "cup"],
  [/^(шт\.?|pcs|pc|piece|pieces)\.?$/i, "pcs"],
  [/^(дрібка|дрібки|pinch|pinches)\.?$/i, "pinch"],
];

function parseNumericToken(token: string): number | null {
  const normalized = token
    .replace("½", "0.5")
    .replace("¼", "0.25")
    .replace("¾", "0.75")
    .replace("⅓", "0.333")
    .replace("⅔", "0.667")
    .replace(",", ".");

  if (/^\d+\s+\d+\/\d+$/.test(normalized)) {
    const [wholeStr, fracStr] = normalized.split(/\s+/);
    const [numStr, denStr] = (fracStr ?? "").split("/");
    const whole = Number(wholeStr);
    const num = Number(numStr);
    const den = Number(denStr);
    if (den > 0) return Number((whole + num / den).toFixed(3));
  }

  if (/^\d+\/\d+$/.test(normalized)) {
    const [numStr, denStr] = normalized.split("/");
    const num = Number(numStr);
    const den = Number(denStr);
    if (den > 0) return Number((num / den).toFixed(3));
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function parseIngredientLine(raw: string): AiParsedRecipe["ingredients"][number] {
  const cleaned = raw.replace(/\s+/g, " ").trim();
  if (/за смаком|to taste/i.test(cleaned)) {
    return {
      name: cleaned.replace(/\s*-?\s*(за смаком|to taste)/i, "").trim() || cleaned,
      amount: null,
      unit: "to_taste",
      isScalable: false,
      groupName: null,
      note: null,
    };
  }

  const match = cleaned.match(
    /^(\d+(?:\s+\d+\/\d+|\/\d+|[.,]\d+)?|[½¼¾⅓⅔])\s*([^\s\d]+)?\s+(.+)$/,
  );

  if (!match) {
    return {
      name: cleaned.slice(0, 120),
      amount: null,
      unit: "pcs",
      isScalable: true,
      groupName: null,
      note: null,
    };
  }

  const amount = parseNumericToken(match[1] ?? "");
  const possibleUnit = (match[2] ?? "").trim();
  let unit: IngredientUnit = "pcs";
  let namePart = match[3] ?? cleaned;

  let matchedUnit = false;
  for (const [regex, mappedUnit] of UNIT_ALIASES) {
    if (regex.test(possibleUnit)) {
      unit = mappedUnit;
      matchedUnit = true;
      break;
    }
  }

  if (!matchedUnit && possibleUnit) {
    namePart = `${possibleUnit} ${namePart}`;
  }

  return {
    name: namePart.trim().slice(0, 120) || cleaned.slice(0, 120),
    amount,
    unit,
    isScalable: amount !== null,
    groupName: null,
    note: null,
  };
}

function extractInstructions(raw: unknown): Array<{ instruction: string; timerSeconds: number | null }> {
  const steps: Array<{ instruction: string; timerSeconds: number | null }> = [];

  const pushText = (text: string) => {
    const trimmed = text.replace(/\s+/g, " ").trim();
    if (trimmed) {
      steps.push({ instruction: trimmed.slice(0, 1500), timerSeconds: null });
    }
  };

  if (typeof raw === "string") {
    for (const line of raw.split(/\n+/)) {
      pushText(line);
    }
    return steps;
  }

  if (!Array.isArray(raw)) {
    return steps;
  }

  for (const item of raw) {
    if (typeof item === "string") {
      pushText(item);
      continue;
    }
    if (item && typeof item === "object") {
      const obj = item as Record<string, unknown>;
      if (Array.isArray(obj.itemListElement)) {
        steps.push(...extractInstructions(obj.itemListElement));
      } else if (typeof obj.text === "string") {
        pushText(obj.text);
      } else if (typeof obj.name === "string") {
        pushText(obj.name);
      }
    }
  }

  return steps;
}

function parseYield(raw: unknown): number {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return Math.min(100, Math.max(1, Math.round(raw)));
  }
  const source = Array.isArray(raw) ? raw[0] : raw;
  if (typeof source === "string") {
    const match = source.match(/\d+/);
    if (match) {
      const num = Number(match[0]);
      if (Number.isFinite(num) && num >= 1) {
        return Math.min(100, num);
      }
    }
  }
  return 4;
}

function detectLocaleFromText(text: string): Locale {
  return /[а-яіїєґА-ЯІЇЄҐ]/.test(text) ? "uk" : "en";
}

export function parseRecipeJsonLd(data: unknown): AiParsedRecipe | null {
  const node = findRecipeNode(data);
  if (!node) {
    return null;
  }

  const title = typeof node.name === "string" ? node.name.trim().slice(0, 120) : "";
  if (!title) {
    return null;
  }

  const description =
    typeof node.description === "string" ? node.description.trim().slice(0, 1000) : "";

  const rawIngredients = Array.isArray(node.recipeIngredient) ? node.recipeIngredient : [];
  const ingredients = rawIngredients
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .slice(0, 60)
    .map(parseIngredientLine);

  const steps = extractInstructions(node.recipeInstructions).slice(0, 50);

  if (ingredients.length === 0 || steps.length === 0) {
    return null;
  }

  const prepTimeMin = parseIsoDurationMinutes(node.prepTime as string | undefined) ?? 15;
  const totalMin = parseIsoDurationMinutes(node.totalTime as string | undefined);
  const cookTimeMin =
    parseIsoDurationMinutes(node.cookTime as string | undefined) ??
    (totalMin && totalMin > prepTimeMin ? totalMin - prepTimeMin : 30);

  const rawKeywords = node.keywords;
  const tags: string[] = [];
  if (typeof rawKeywords === "string") {
    for (const kw of rawKeywords.split(",")) {
      const clean = kw.trim().slice(0, 40);
      if (clean && tags.length < 10) tags.push(clean);
    }
  } else if (Array.isArray(rawKeywords)) {
    for (const kw of rawKeywords) {
      if (typeof kw === "string" && kw.trim() && tags.length < 10) {
        tags.push(kw.trim().slice(0, 40));
      }
    }
  }

  const combinedText = `${title} ${description} ${ingredients.map((i) => i.name).join(" ")}`;

  return {
    title,
    description,
    locale: detectLocaleFromText(combinedText),
    baseServings: parseYield(node.recipeYield),
    prepTimeMin,
    cookTimeMin,
    difficulty: "medium",
    tags,
    ingredients,
    steps,
  };
}

export function extractRecipeFromHtml(html: string): AiParsedRecipe | null {
  const scriptRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null = scriptRegex.exec(html);

  while (match !== null) {
    const content = match[1]?.trim();
    if (content) {
      try {
        const parsed = JSON.parse(content) as unknown;
        const recipe = parseRecipeJsonLd(parsed);
        if (recipe) {
          return recipe;
        }
      } catch {
        // Ignore malformed JSON-LD blocks and continue checking remaining scripts
      }
    }
    match = scriptRegex.exec(html);
  }

  return null;
}

const NAMED_HTML_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

function decodeHtmlEntities(text: string): string {
  return text.replace(
    /&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi,
    (match, entity: string) => {
      const lower = entity.toLowerCase();
      if (lower in NAMED_HTML_ENTITIES) {
        return NAMED_HTML_ENTITIES[lower] ?? match;
      }
      if (lower.startsWith("#x")) {
        const code = Number.parseInt(lower.slice(2), 16);
        return Number.isFinite(code) && code >= 0 && code <= 0x10ffff
          ? String.fromCodePoint(code)
          : match;
      }
      if (lower.startsWith("#")) {
        const code = Number.parseInt(lower.slice(1), 10);
        return Number.isFinite(code) && code >= 0 && code <= 0x10ffff
          ? String.fromCodePoint(code)
          : match;
      }
      return match;
    },
  );
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function extractTikTokDescription(html: string): string | null {
  const rehydrationMatch = html.match(
    /<script[^>]*id=["']__UNIVERSAL_DATA_FOR_REHYDRATION__["'][^>]*>([\s\S]*?)<\/script>/i,
  );
  if (rehydrationMatch?.[1]) {
    try {
      const root = asRecord(JSON.parse(rehydrationMatch[1]) as unknown);
      const defaultScope = asRecord(root?.["__DEFAULT_SCOPE__"]);
      const videoDetail = asRecord(defaultScope?.["webapp.video-detail"]);
      const itemInfo = asRecord(videoDetail?.itemInfo);
      const itemStruct = asRecord(itemInfo?.itemStruct);

      if (Array.isArray(itemStruct?.contents)) {
        const lines = itemStruct.contents
          .map((entry) => {
            const record = asRecord(entry);
            return typeof record?.desc === "string" ? record.desc.trim() : "";
          })
          .filter((line) => line.length > 0);
        const joined = lines.join("\n").trim();
        if (joined.length >= 20) {
          return joined;
        }
      }

      if (typeof itemStruct?.desc === "string" && itemStruct.desc.trim().length >= 20) {
        return itemStruct.desc.trim();
      }

      const shareMeta = asRecord(videoDetail?.shareMeta);
      if (typeof shareMeta?.desc === "string" && shareMeta.desc.trim().length >= 20) {
        return shareMeta.desc.trim();
      }
    } catch {
      // Ignore malformed TikTok rehydration JSON and continue fallbacks
    }
  }

  const sigiMatch = html.match(/<script[^>]*id=["']SIGI_STATE["'][^>]*>([\s\S]*?)<\/script>/i);
  if (sigiMatch?.[1]) {
    try {
      const root = asRecord(JSON.parse(sigiMatch[1]) as unknown);
      const itemModule = asRecord(root?.ItemModule);
      if (itemModule) {
        for (const item of Object.values(itemModule)) {
          const itemRecord = asRecord(item);
          if (typeof itemRecord?.desc === "string" && itemRecord.desc.trim().length >= 20) {
            return itemRecord.desc.trim();
          }
        }
      }
    } catch {
      // Ignore malformed SIGI_STATE JSON
    }
  }

  return null;
}

const RECIPE_META_KEYS = new Set([
  "og:title",
  "og:description",
  "description",
  "twitter:title",
  "twitter:description",
]);

function readHtmlAttribute(tag: string, attrName: string): string | null {
  const regex = new RegExp(`\\b${attrName}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'>]+))`, "i");
  const match = tag.match(regex);
  return match?.[1] ?? match?.[2] ?? match?.[3] ?? null;
}

function extractMetaDescriptions(html: string): string {
  const collected: string[] = [];
  const seen = new Set<string>();
  const metaRegex = /<meta\b[^>]*>/gi;
  let match = metaRegex.exec(html);

  while (match !== null) {
    const tag = match[0];
    const key = (
      readHtmlAttribute(tag, "property") ??
      readHtmlAttribute(tag, "name") ??
      ""
    )
      .trim()
      .toLowerCase();

    if (RECIPE_META_KEYS.has(key)) {
      const rawContent = readHtmlAttribute(tag, "content");
      const decoded = rawContent
        ? decodeHtmlEntities(rawContent).replace(/\s+/g, " ").trim()
        : "";
      if (decoded && !seen.has(decoded)) {
        seen.add(decoded);
        collected.push(decoded);
      }
    }

    match = metaRegex.exec(html);
  }

  return collected.join("\n");
}

/**
 * Extracts recipe-bearing text from HTML, prioritizing TikTok video captions and
 * OpenGraph/meta descriptions before falling back to stripped body text.
 */
export function extractReadableTextFromHtml(html: string, maxLength = 12_000): string {
  const tiktokText = extractTikTokDescription(html);
  if (tiktokText) {
    return tiktokText.slice(0, maxLength);
  }

  const visibleText = decodeHtmlEntities(
    html
      .replace(/<(script|style|noscript|svg)\b[\s\S]*?<\/\1>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();

  const metaText = extractMetaDescriptions(html);
  if (!metaText) {
    return visibleText.slice(0, maxLength);
  }

  if (!visibleText) {
    return metaText.slice(0, maxLength);
  }

  const normalizedVisible = visibleText.toLowerCase();
  const hasUniqueMeta = metaText
    .split("\n")
    .some((line) => line.length >= 15 && !normalizedVisible.includes(line.toLowerCase()));

  const combined = hasUniqueMeta ? `${metaText}\n\n${visibleText}` : visibleText;
  return combined.trim().slice(0, maxLength);
}
