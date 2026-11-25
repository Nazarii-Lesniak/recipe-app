import type { MetadataRoute } from "next";
import { env } from "@/core/env";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = env.NEXT_PUBLIC_APP_URL ?? env.BETTER_AUTH_URL ?? "http://localhost:3000";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/uk/admin/", "/en/admin/", "/uk/my-recipes", "/en/my-recipes"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
