import type { MetadataRoute } from "next";
import { ROUTES } from "@/config/routes";
import { SITE_CONFIG } from "@/config/site";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: [...ROUTES.publicPages],
      disallow: [...ROUTES.privatePrefixes],
    },
    sitemap: `${SITE_CONFIG.url}/sitemap.xml`,
  };
}
