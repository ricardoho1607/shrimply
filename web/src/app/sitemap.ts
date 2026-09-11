import type { MetadataRoute } from "next";
import { canonicalUrl, sitemapPages } from "@/config/seo";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const billingPages = ['/pricing', '/id/pricing'].map(path => ({ path, priority: 0.9, changeFrequency: 'monthly' as const, lastModified: '2026-09-09' }));
  const legalPages = [{ path: '/privacy', priority: 0.5, changeFrequency: 'monthly' as const, lastModified: '2026-09-11' }];
  return [...sitemapPages, ...billingPages, ...legalPages].map(({ path, priority, changeFrequency, lastModified }) => ({
    url: canonicalUrl(path),
    lastModified: new Date(lastModified),
    changeFrequency,
    priority,
  }));
}
