import type { Metadata } from "next";
import { SITE_CONFIG } from "@/config/site";
import { resourceArticles } from "@/data/resourceLibrary";

export type SeoPage = {
  path: string;
  title: string;
  description: string;
  priority: number;
  changeFrequency: "weekly" | "monthly";
  lastModified: string;
};

export const PUBLIC_SITE_LAST_MODIFIED = "2026-07-09";

export const canonicalUrl = (path: string) => {
  const siteUrl = SITE_CONFIG.url.replace(/\/$/, "");
  const normalizedPath = path === "/" ? "" : `/${path.replace(/^\/+/, "").replace(/\/$/, "")}`;
  return `${siteUrl}${normalizedPath}`;
};

export const seoMetadata = (page: Pick<SeoPage, "path" | "title" | "description">): Metadata => ({
  title: {
    absolute: page.title,
  },
  description: page.description,
  alternates: {
    canonical: canonicalUrl(page.path),
  },
  openGraph: {
    title: page.title,
    description: page.description,
    url: canonicalUrl(page.path),
    siteName: SITE_CONFIG.name,
    images: [
      {
        url: SITE_CONFIG.ogImage.path,
        width: SITE_CONFIG.ogImage.width,
        height: SITE_CONFIG.ogImage.height,
        alt: SITE_CONFIG.ogImage.alt,
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: page.title,
    description: page.description,
    images: [SITE_CONFIG.ogImage.path],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
});

export const coreSeoPages: SeoPage[] = [
  {
    path: "/",
    title: SITE_CONFIG.title,
    description: SITE_CONFIG.description,
    priority: 1,
    changeFrequency: "weekly",
    lastModified: PUBLIC_SITE_LAST_MODIFIED,
  },
  {
    path: "/about",
    title: "About Shrimply | Shrimp Farm Software Built for Aquaculture Teams",
    description: "Learn why Shrimply was built for shrimp farmers who need reliable pond, feed, water quality, finance, and disease-risk data in one operating system.",
    priority: 0.75,
    changeFrequency: "monthly",
    lastModified: PUBLIC_SITE_LAST_MODIFIED,
  },
  {
    path: "/how-it-works",
    title: "How Shrimply Works | Shrimp Farm Operations Platform",
    description: "See how Shrimply connects mobile field logging, pond records, inventory, reporting, finance, marketplace visibility, and Orson AI insights.",
    priority: 0.85,
    changeFrequency: "monthly",
    lastModified: PUBLIC_SITE_LAST_MODIFIED,
  },
  {
    path: "/resources",
    title: "Shrimp Farming Resources | Vannamei Guides and Aquaculture Education",
    description: "Read practical Shrimply guides for shrimp farm management, FCR, MBW, water quality, feed inventory, growth sampling, harvest planning, finance, and disease alerts.",
    priority: 0.9,
    changeFrequency: "weekly",
    lastModified: PUBLIC_SITE_LAST_MODIFIED,
  },
  {
    path: "/orson",
    title: "Orson AI | Shrimp Farm Intelligence for Feed, Growth, and Risk",
    description: "Orson AI helps shrimp farms interpret pond records, feed response, water quality trends, sampling data, and biological risk patterns.",
    priority: 0.8,
    changeFrequency: "monthly",
    lastModified: PUBLIC_SITE_LAST_MODIFIED,
  },
  {
    path: "/download",
    title: "Download Shrimply Android App | Closed Testing Access",
    description: "Request access to the Shrimply Android app closed testing track. Shrimply is currently available only for approved Android testers.",
    priority: 0.86,
    changeFrequency: "weekly",
    lastModified: PUBLIC_SITE_LAST_MODIFIED,
  },
];

export const featureSeoPages: SeoPage[] = [
  {
    path: "/shrimp-farm-management-software",
    title: "Shrimp Farm Management Software | Shrimply",
    description: "Shrimply gives shrimp farms one platform for pond performance, feed inventory, water quality, sampling, harvests, finance, assets, disease alerts, and reports.",
    priority: 0.95,
    changeFrequency: "weekly",
    lastModified: PUBLIC_SITE_LAST_MODIFIED,
  },
  {
    path: "/vannamei-shrimp-farming-app",
    title: "Vannamei Shrimp Farming App | Shrimply",
    description: "A mobile and web app for vannamei shrimp farms to track ponds, DOC, MBW, ADG, FCR, feed use, water quality, mortality, harvests, and cycle performance.",
    priority: 0.9,
    changeFrequency: "weekly",
    lastModified: PUBLIC_SITE_LAST_MODIFIED,
  },
  {
    path: "/features/feed-inventory",
    title: "Shrimp Feed Inventory Tracking Software | Shrimply",
    description: "Track feed stock, feed brands, feeding activity, reorder needs, inventory movement, and farm consumption across shrimp ponds with Shrimply.",
    priority: 0.85,
    changeFrequency: "weekly",
    lastModified: PUBLIC_SITE_LAST_MODIFIED,
  },
  {
    path: "/features/water-quality-monitoring",
    title: "Shrimp Pond Water Quality Monitoring Software | Shrimply",
    description: "Record and review shrimp pond water quality trends including DO, pH, temperature, salinity, alkalinity, ammonia, and operational risk signals.",
    priority: 0.85,
    changeFrequency: "weekly",
    lastModified: PUBLIC_SITE_LAST_MODIFIED,
  },
  {
    path: "/features/growth-sampling",
    title: "Shrimp Growth Sampling and MBW Tracking | Shrimply",
    description: "Track shrimp sampling records, MBW, ADG, mortality, biomass, population, and growth trends so farm teams can make better cycle decisions.",
    priority: 0.85,
    changeFrequency: "weekly",
    lastModified: PUBLIC_SITE_LAST_MODIFIED,
  },
  {
    path: "/features/shrimp-harvest-tracking",
    title: "Shrimp Harvest Tracking Software | Shrimply",
    description: "Track shrimp harvest weights, sizes, pond outcomes, cycle totals, buyer readiness, and production history in one shrimp farm management platform.",
    priority: 0.8,
    changeFrequency: "weekly",
    lastModified: PUBLIC_SITE_LAST_MODIFIED,
  },
  {
    path: "/features/shrimp-farm-finance",
    title: "Shrimp Farm Finance and Cost Tracking | Shrimply",
    description: "Understand shrimp farm cash flow, COGS, profit and loss, inventory costs, harvest revenue, and financial projections with Shrimply reports.",
    priority: 0.8,
    changeFrequency: "weekly",
    lastModified: PUBLIC_SITE_LAST_MODIFIED,
  },
  {
    path: "/features/disease-alerts",
    title: "Shrimp Disease Alert and Biosecurity Software | Shrimply",
    description: "Shrimply helps farms track disease alerts, nearby outbreak risk, biosecurity signals, and pond conditions that require faster operational response.",
    priority: 0.8,
    changeFrequency: "weekly",
    lastModified: PUBLIC_SITE_LAST_MODIFIED,
  },
];

export const resourceSeoPages: SeoPage[] = resourceArticles.map(article => ({
  path: `/resources/${article.slug}`,
  title: `${article.title} | Shrimply Resources`,
  description: article.description,
  priority: 0.72,
  changeFrequency: "monthly",
  lastModified: article.updatedAt ?? article.publishedAt ?? PUBLIC_SITE_LAST_MODIFIED,
}));

export const sitemapPages = [...coreSeoPages, ...featureSeoPages, ...resourceSeoPages];
