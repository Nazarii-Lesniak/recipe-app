import { describe, expect, it } from "vitest";
import {
  extractReadableTextFromHtml,
  extractRecipeFromHtml,
  isSafeExternalUrl,
  parseIsoDurationMinutes,
  parseRecipeJsonLd,
} from "../json-ld";
import { slugifyRecipeTitle } from "../slug";

describe("isSafeExternalUrl (SSRF protection)", () => {
  it("accepts public http/https URLs", () => {
    expect(isSafeExternalUrl("https://example.com/recipes/borscht")).toBe(true);
    expect(isSafeExternalUrl("http://cooking.example.org/pasta")).toBe(true);
  });

  it("rejects private, loopback, link-local, non-http, and credentialed URLs", () => {
    expect(isSafeExternalUrl("http://localhost:3000/api")).toBe(false);
    expect(isSafeExternalUrl("http://127.0.0.1/admin")).toBe(false);
    expect(isSafeExternalUrl("http://10.0.0.5/secret")).toBe(false);
    expect(isSafeExternalUrl("http://172.16.0.1/internal")).toBe(false);
    expect(isSafeExternalUrl("http://192.168.1.1/router")).toBe(false);
    expect(isSafeExternalUrl("http://169.254.169.254/latest/meta-data")).toBe(false);
    expect(isSafeExternalUrl("http://[::1]/test")).toBe(false);
    expect(isSafeExternalUrl("file:///etc/passwd")).toBe(false);
    expect(isSafeExternalUrl("https://user:pass@example.com")).toBe(false);
  });
});

describe("parseIsoDurationMinutes", () => {
  it("parses ISO 8601 durations", () => {
    expect(parseIsoDurationMinutes("PT1H20M")).toBe(80);
    expect(parseIsoDurationMinutes("PT45M")).toBe(45);
    expect(parseIsoDurationMinutes("invalid")).toBeNull();
  });
});

describe("JSON-LD recipe extraction", () => {
  it("extracts schema.org/Recipe from @graph and HowToSection instructions", () => {
    const html = `
      <html>
        <head>
          <script type="application/ld+json">
            {
              "@context": "https://schema.org",
              "@graph": [
                { "@type": "WebPage", "name": "Blog" },
                {
                  "@type": "Recipe",
                  "name": "Сирники домашні",
                  "description": "Ніжні сирники на сніданок",
                  "recipeYield": "4 порції",
                  "prepTime": "PT15M",
                  "cookTime": "PT20M",
                  "keywords": "сніданок, сирники",
                  "recipeIngredient": ["500 г кисломолочного сиру", "2 шт яйця", "Сіль за смаком"],
                  "recipeInstructions": [
                    {
                      "@type": "HowToSection",
                      "itemListElement": [
                        { "@type": "HowToStep", "text": "Змішати сир з яйцями." },
                        { "@type": "HowToStep", "text": "Обсмажити з обох боків." }
                      ]
                    }
                  ]
                }
              ]
            }
          </script>
        </head>
      </html>
    `;

    const parsed = extractRecipeFromHtml(html);
    expect(parsed).not.toBeNull();
    expect(parsed?.title).toBe("Сирники домашні");
    expect(parsed?.locale).toBe("uk");
    expect(parsed?.baseServings).toBe(4);
    expect(parsed?.prepTimeMin).toBe(15);
    expect(parsed?.cookTimeMin).toBe(20);
    expect(parsed?.ingredients).toHaveLength(3);
    expect(parsed?.ingredients[0]).toMatchObject({ amount: 500, unit: "g" });
    expect(parsed?.ingredients[2]).toMatchObject({ unit: "to_taste", isScalable: false });
    expect(parsed?.steps).toHaveLength(2);
  });

  it("returns null for non-recipe JSON-LD", () => {
    expect(parseRecipeJsonLd({ "@type": "Article", headline: "Hello" })).toBeNull();
  });
});

describe("extractReadableTextFromHtml", () => {
  it("extracts multi-line recipe text from TikTok rehydration JSON instead of shell title", () => {
    const html = `
      <!doctype html>
      <html>
        <head><title>TikTok - Make Your Day</title></head>
        <body>
          <div id="app"></div>
          <script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application/json">
            ${JSON.stringify({
              __DEFAULT_SCOPE__: {
                "webapp.video-detail": {
                  itemInfo: {
                    itemStruct: {
                      contents: [
                        { desc: "Трендовий салат з ТікТоку" },
                        { desc: "Відварена картопля - 4 шт" },
                        { desc: "Філе оселедця - 2 шт" },
                      ],
                    },
                  },
                },
              },
            })}
          </script>
        </body>
      </html>
    `;

    const extracted = extractReadableTextFromHtml(html);
    expect(extracted).toContain("Трендовий салат з ТікТоку");
    expect(extracted).toContain("Філе оселедця - 2 шт");
    expect(extracted).not.toContain("Make Your Day");
  });

  it("extracts og:description and meta description with decoded entities on SPA shells", () => {
    const html = `
      <html>
        <head>
          <meta content="Chef&#39;s &quot;Crispy&quot; Roast &amp; Gravy" property="og:title" />
          <meta name="description" content="Ingredients: 500 g chicken, 2 tbsp olive oil. Bake for 40 min." />
        </head>
        <body><div id="root">Loading...</div></body>
      </html>
    `;

    const extracted = extractReadableTextFromHtml(html);
    expect(extracted).toContain(`Chef's "Crispy" Roast & Gravy`);
    expect(extracted).toContain("Ingredients: 500 g chicken, 2 tbsp olive oil.");
  });

  it("keeps boilerplate-only shell pages short enough to reject", () => {
    const html = `<html><head><title>TikTok - Make Your Day</title></head><body><script>window.x=1</script></body></html>`;
    const extracted = extractReadableTextFromHtml(html);
    expect(extracted).toBe("TikTok - Make Your Day");
    expect(extracted.length).toBeLessThan(40);
  });
});

describe("slugifyRecipeTitle", () => {
  it("transliterates Ukrainian characters accurately", () => {
    expect(slugifyRecipeTitle("Борщ зі сметаною та часником!")).toBe(
      "borshch-zi-smetanoyu-ta-chasnykom",
    );
  });
});
