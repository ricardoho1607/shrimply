import type { MetadataRoute } from "next";
import { canonicalUrl, sitemapPages } from "@/config/seo";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return sitemapPages.map(({ path, priority, changeFrequency, lastModified }) => ({
    url: canonicalUrl(path),
    lastModified: new Date(lastModified),
    changeFrequency,
    priority,
  }));
}
