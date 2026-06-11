import type { MetadataRoute } from "next";
import { canonicalUrl, sitemapPages } from "@/config/seo";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return sitemapPages.map(({ path, priority, changeFrequency }) => ({
    url: canonicalUrl(path),
    lastModified: new Date(),
    changeFrequency,
    priority,
  }));
}
