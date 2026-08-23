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

/** Build the /id/ path equivalent for an English page path. */
const toIdPath = (enPath: string) => {
  if (enPath === "/") return "/id";
  return `/id${enPath.startsWith("/") ? enPath : `/${enPath}`}`;
};

export const seoMetadata = (page: Pick<SeoPage, "path" | "title" | "description">): Metadata => ({
  title: {
    absolute: page.title,
  },
  description: page.description,
  alternates: {
    canonical: canonicalUrl(page.path),
    languages: {
      "en": canonicalUrl(page.path),
      "id": canonicalUrl(toIdPath(page.path)),
      "x-default": canonicalUrl(page.path),
    },
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

/** SEO metadata for Indonesian pages — locale set to id_ID, hreflang links back to English. */
export const seoMetadataID = (
  idPage: Pick<SeoPage, "path" | "title" | "description">,
  enPath: string,
): Metadata => ({
  title: {
    absolute: idPage.title,
  },
  description: idPage.description,
  alternates: {
    canonical: canonicalUrl(idPage.path),
    languages: {
      "en": canonicalUrl(enPath),
      "id": canonicalUrl(idPage.path),
      "x-default": canonicalUrl(enPath),
    },
  },
  openGraph: {
    title: idPage.title,
    description: idPage.description,
    url: canonicalUrl(idPage.path),
    siteName: SITE_CONFIG.name,
    images: [
      {
        url: SITE_CONFIG.ogImage.path,
        width: SITE_CONFIG.ogImage.width,
        height: SITE_CONFIG.ogImage.height,
        alt: SITE_CONFIG.ogImage.alt,
      },
    ],
    locale: "id_ID",
    alternateLocale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: idPage.title,
    description: idPage.description,
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
    title: "Download Shrimply for Android | Google Play",
    description: "Download the Shrimply shrimp farm management app for Android from Google Play, or add the Shrimply web app to your iPhone Home Screen.",
    priority: 0.86,
    changeFrequency: "weekly",
    lastModified: "2026-08-11",
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

/* ── Indonesian (id) SEO pages ─────────────────────────────────────── */

const ID_LAST_MODIFIED = "2026-08-23";

export const coreSeoPages_id: SeoPage[] = [
  {
    path: "/id",
    title: "Shrimply | Software Manajemen Tambak Udang untuk Budidaya Vannamei",
    description: "Shrimply membantu tambak udang melacak kinerja kolam, inventaris pakan, kualitas air, sampling pertumbuhan, panen, keuangan, aset, dan peringatan penyakit dalam satu platform.",
    priority: 1,
    changeFrequency: "weekly",
    lastModified: ID_LAST_MODIFIED,
  },
  {
    path: "/id/about",
    title: "Tentang Shrimply | Software Tambak Udang untuk Tim Akuakultur",
    description: "Pelajari mengapa Shrimply dibangun untuk petambak udang yang membutuhkan data kolam, pakan, kualitas air, keuangan, dan risiko penyakit dalam satu sistem operasi.",
    priority: 0.75,
    changeFrequency: "monthly",
    lastModified: ID_LAST_MODIFIED,
  },
  {
    path: "/id/how-it-works",
    title: "Cara Kerja Shrimply | Platform Operasi Tambak Udang",
    description: "Lihat bagaimana Shrimply menghubungkan pencatatan mobile di lapangan, data kolam, inventaris, pelaporan, keuangan, visibilitas pasar, dan wawasan Orson AI.",
    priority: 0.85,
    changeFrequency: "monthly",
    lastModified: ID_LAST_MODIFIED,
  },
  {
    path: "/id/orson",
    title: "Orson AI | Kecerdasan Tambak Udang untuk Pakan, Pertumbuhan, dan Risiko",
    description: "Orson AI membantu tambak udang menginterpretasikan catatan kolam, respons pakan, tren kualitas air, data sampling, dan pola risiko biologis.",
    priority: 0.8,
    changeFrequency: "monthly",
    lastModified: ID_LAST_MODIFIED,
  },
  {
    path: "/id/download",
    title: "Unduh Shrimply untuk Android | Google Play",
    description: "Unduh aplikasi manajemen tambak udang Shrimply untuk Android dari Google Play, atau tambahkan aplikasi web Shrimply ke Home Screen iPhone Anda.",
    priority: 0.86,
    changeFrequency: "weekly",
    lastModified: ID_LAST_MODIFIED,
  },
];

export const featureSeoPages_id: SeoPage[] = [
  {
    path: "/id/shrimp-farm-management-software",
    title: "Software Manajemen Tambak Udang | Shrimply",
    description: "Shrimply memberikan tambak udang satu platform untuk kinerja kolam, inventaris pakan, kualitas air, sampling, panen, keuangan, aset, peringatan penyakit, dan laporan.",
    priority: 0.95,
    changeFrequency: "weekly",
    lastModified: ID_LAST_MODIFIED,
  },
  {
    path: "/id/vannamei-shrimp-farming-app",
    title: "Aplikasi Budidaya Udang Vannamei | Shrimply",
    description: "Aplikasi mobile dan web untuk tambak udang vannamei untuk melacak kolam, DOC, MBW, ADG, FCR, penggunaan pakan, kualitas air, mortalitas, panen, dan kinerja siklus.",
    priority: 0.9,
    changeFrequency: "weekly",
    lastModified: ID_LAST_MODIFIED,
  },
  {
    path: "/id/features/feed-inventory",
    title: "Software Pelacakan Inventaris Pakan Udang | Shrimply",
    description: "Lacak stok pakan, merek pakan, aktivitas pemberian pakan, kebutuhan pemesanan ulang, pergerakan inventaris, dan konsumsi tambak di seluruh kolam udang dengan Shrimply.",
    priority: 0.85,
    changeFrequency: "weekly",
    lastModified: ID_LAST_MODIFIED,
  },
  {
    path: "/id/features/water-quality-monitoring",
    title: "Software Monitoring Kualitas Air Kolam Udang | Shrimply",
    description: "Catat dan tinjau tren kualitas air kolam udang termasuk DO, pH, suhu, salinitas, alkalinitas, amonia, dan sinyal risiko operasional.",
    priority: 0.85,
    changeFrequency: "weekly",
    lastModified: ID_LAST_MODIFIED,
  },
  {
    path: "/id/features/growth-sampling",
    title: "Sampling Pertumbuhan Udang dan Pelacakan MBW | Shrimply",
    description: "Lacak catatan sampling udang, MBW, ADG, mortalitas, biomassa, populasi, dan tren pertumbuhan agar tim tambak dapat membuat keputusan siklus yang lebih baik.",
    priority: 0.85,
    changeFrequency: "weekly",
    lastModified: ID_LAST_MODIFIED,
  },
  {
    path: "/id/features/shrimp-harvest-tracking",
    title: "Software Pelacakan Panen Udang | Shrimply",
    description: "Lacak berat panen udang, ukuran, hasil kolam, total siklus, kesiapan pembeli, dan riwayat produksi dalam satu platform manajemen tambak udang.",
    priority: 0.8,
    changeFrequency: "weekly",
    lastModified: ID_LAST_MODIFIED,
  },
  {
    path: "/id/features/shrimp-farm-finance",
    title: "Keuangan dan Pelacakan Biaya Tambak Udang | Shrimply",
    description: "Pahami arus kas tambak udang, COGS, laba rugi, biaya inventaris, pendapatan panen, dan proyeksi keuangan dengan laporan Shrimply.",
    priority: 0.8,
    changeFrequency: "weekly",
    lastModified: ID_LAST_MODIFIED,
  },
  {
    path: "/id/features/disease-alerts",
    title: "Peringatan Penyakit dan Software Biosekuriti Tambak Udang | Shrimply",
    description: "Shrimply membantu tambak melacak peringatan penyakit, risiko wabah terdekat, sinyal biosekuriti, dan kondisi kolam yang membutuhkan respons operasional lebih cepat.",
    priority: 0.8,
    changeFrequency: "weekly",
    lastModified: ID_LAST_MODIFIED,
  },
];

export const sitemapPages = [
  ...coreSeoPages,
  ...featureSeoPages,
  ...resourceSeoPages,
  ...coreSeoPages_id,
  ...featureSeoPages_id,
];

