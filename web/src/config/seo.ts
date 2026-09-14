import type { Metadata } from "next";
import { SITE_CONFIG } from "@/config/site";
import { resourceArticles } from "@/data/resourceLibrary";
import { resourceArticlesID } from "@/data/resourceLibraryID";
import { resourceArticlesTH } from "@/data/resourceLibraryTH";
import { resourceArticlesVI } from "@/data/resourceLibraryVI";

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

/** Build the /th/ path equivalent for an English page path. */
const toThPath = (enPath: string) => {
  if (enPath === "/") return "/th";
  return `/th${enPath.startsWith("/") ? enPath : `/${enPath}`}`;
};

/** Build the /vi/ path equivalent for an English page path. */
const toViPath = (enPath: string) => {
  if (enPath === "/") return "/vi";
  return `/vi${enPath.startsWith("/") ? enPath : `/${enPath}`}`;
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
      "th": canonicalUrl(toThPath(page.path)),
      "vi": canonicalUrl(toViPath(page.path)),
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

/** SEO metadata for Indonesian pages — locale set to id_ID. */
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
      "th": canonicalUrl(toThPath(enPath)),
      "vi": canonicalUrl(toViPath(enPath)),
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
    alternateLocale: ["en_US", "th_TH", "vi_VN"],
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

/** SEO metadata for Thai pages — locale set to th_TH. */
export const seoMetadataTH = (
  thPage: Pick<SeoPage, "path" | "title" | "description">,
  enPath: string,
): Metadata => ({
  title: {
    absolute: thPage.title,
  },
  description: thPage.description,
  alternates: {
    canonical: canonicalUrl(thPage.path),
    languages: {
      "en": canonicalUrl(enPath),
      "id": canonicalUrl(toIdPath(enPath)),
      "th": canonicalUrl(thPage.path),
      "vi": canonicalUrl(toViPath(enPath)),
      "x-default": canonicalUrl(enPath),
    },
  },
  openGraph: {
    title: thPage.title,
    description: thPage.description,
    url: canonicalUrl(thPage.path),
    siteName: SITE_CONFIG.name,
    images: [
      {
        url: SITE_CONFIG.ogImage.path,
        width: SITE_CONFIG.ogImage.width,
        height: SITE_CONFIG.ogImage.height,
        alt: SITE_CONFIG.ogImage.alt,
      },
    ],
    locale: "th_TH",
    alternateLocale: ["en_US", "id_ID", "vi_VN"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: thPage.title,
    description: thPage.description,
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

/** SEO metadata for Vietnamese pages — locale set to vi_VN. */
export const seoMetadataVI = (
  viPage: Pick<SeoPage, "path" | "title" | "description">,
  enPath: string,
): Metadata => ({
  title: {
    absolute: viPage.title,
  },
  description: viPage.description,
  alternates: {
    canonical: canonicalUrl(viPage.path),
    languages: {
      "en": canonicalUrl(enPath),
      "id": canonicalUrl(toIdPath(enPath)),
      "th": canonicalUrl(toThPath(enPath)),
      "vi": canonicalUrl(viPage.path),
      "x-default": canonicalUrl(enPath),
    },
  },
  openGraph: {
    title: viPage.title,
    description: viPage.description,
    url: canonicalUrl(viPage.path),
    siteName: SITE_CONFIG.name,
    images: [
      {
        url: SITE_CONFIG.ogImage.path,
        width: SITE_CONFIG.ogImage.width,
        height: SITE_CONFIG.ogImage.height,
        alt: SITE_CONFIG.ogImage.alt,
      },
    ],
    locale: "vi_VN",
    alternateLocale: ["en_US", "id_ID", "th_TH"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: viPage.title,
    description: viPage.description,
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
    path: "/shrimp-feed-management-software",
    title: "Shrimp Feed Management Software for Vannamei Farms | Shrimply",
    description: "Control feed inventory, daily feed logs, FCR, feed index, feeding rates by biomass, and tray consumption across vannamei shrimp ponds with Shrimply.",
    priority: 0.92,
    changeFrequency: "weekly",
    lastModified: "2026-09-12",
  },
  {
    path: "/shrimp-water-quality-monitoring-software",
    title: "Shrimp Water Quality Monitoring Software for Vannamei Farms | Shrimply",
    description: "Track dissolved oxygen, pH swings, temperature, salinity, alkalinity, ammonia, nitrite, and biological risk across shrimp ponds with Shrimply.",
    priority: 0.92,
    changeFrequency: "weekly",
    lastModified: "2026-09-12",
  },
  {
    path: "/shrimp-growth-sampling-software",
    title: "Shrimp Growth & Sampling Software for Vannamei Farms | Shrimply",
    description: "Track shrimp sampling records, MBW look-back, ADG calculations, biomass estimation, DOC benchmarks, and harvest forecasts with Shrimply.",
    priority: 0.92,
    changeFrequency: "weekly",
    lastModified: "2026-09-12",
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
  {
    path: "/id/resources",
    title: "Panduan Budidaya Udang | Pusat Edukasi & Operasional Vannamei | Shrimply",
    description: "Baca panduan praktis Shrimply untuk manajemen tambak udang vannamei: FCR, MBW, kualitas air, inventaris pakan, sampling pertumbuhan, panen, keuangan, dan peringatan penyakit.",
    priority: 0.9,
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

export const resourceSeoPages_id: SeoPage[] = resourceArticlesID.map(article => ({
  path: `/id/resources/${article.slug}`,
  title: `${article.title} | Panduan Shrimply`,
  description: article.description,
  priority: 0.72,
  changeFrequency: "monthly",
  lastModified: article.updatedAt ?? article.publishedAt ?? ID_LAST_MODIFIED,
}));

/* ── Thai (th) SEO pages ─────────────────────────────────────────── */

const TH_LAST_MODIFIED = "2026-08-23";

export const coreSeoPages_th: SeoPage[] = [
  {
    path: "/th",
    title: "Shrimply | ซอฟต์แวร์จัดการฟาร์มกุ้งสำหรับการเลี้ยงกุ้งขาวแวนนาไม",
    description: "Shrimply ช่วยฟาร์มกุ้งติดตามประสิทธิภาพบ่อ สต็อกอาหาร คุณภาพน้ำ การสุ่มตัวอย่าง การเก็บเกี่ยว การเงิน และการแจ้งเตือนโรคในแพลตฟอร์มเดียว",
    priority: 1,
    changeFrequency: "weekly",
    lastModified: TH_LAST_MODIFIED,
  },
  {
    path: "/th/about",
    title: "เกี่ยวกับ Shrimply | ซอฟต์แวร์ฟาร์มกุ้งสำหรับทีมเพาะเลี้ยงสัตว์น้ำ",
    description: "เรียนรู้ว่าทำไม Shrimply จึงถูกสร้างขึ้นสำหรับเกษตรกรผู้เลี้ยงกุ้งที่ต้องการข้อมูลบ่อ อาหาร คุณภาพน้ำ การเงิน และความเสี่ยงของโรคในระบบเดียว",
    priority: 0.75,
    changeFrequency: "monthly",
    lastModified: TH_LAST_MODIFIED,
  },
  {
    path: "/th/how-it-works",
    title: "วิธีใช้งาน Shrimply | แพลตฟอร์มการดำเนินงานฟาร์มกุ้ง",
    description: "ดูวิธีที่ Shrimply เชื่อมโยงการบันทึกข้อมูลภาคสนาม ข้อมูลบ่อ คลังสินค้า การรายงาน การเงิน ตลาด และข้อมูลเชิงลึกจาก Orson AI",
    priority: 0.85,
    changeFrequency: "monthly",
    lastModified: TH_LAST_MODIFIED,
  },
  {
    path: "/th/orson",
    title: "Orson AI | ปัญญาประดิษฐ์สำหรับฟาร์มกุ้งเพื่ออาหาร การเติบโต และความเสี่ยง",
    description: "Orson AI ช่วยฟาร์มกุ้งวิเคราะห์ข้อมูลบ่อ การตอบสนองต่ออาหาร แนวโน้มคุณภาพน้ำ ข้อมูลการสุ่มตัวอย่าง และรูปแบบความเสี่ยงทางชีวภาพ",
    priority: 0.8,
    changeFrequency: "monthly",
    lastModified: TH_LAST_MODIFIED,
  },
  {
    path: "/th/download",
    title: "ดาวน์โหลด Shrimply สำหรับ Android | Google Play",
    description: "ดาวน์โหลดแอปจัดการฟาร์มกุ้ง Shrimply สำหรับ Android บน Google Play หรือเพิ่มเว็บแอป Shrimply ไปยังหน้าจอหลักของ iPhone",
    priority: 0.86,
    changeFrequency: "weekly",
    lastModified: TH_LAST_MODIFIED,
  },
  {
    path: "/th/resources",
    title: "ศูนย์รวมคู่มือการเลี้ยงกุ้ง & แหล่งความรู้ Shrimply",
    description: "คู่มือปฏิบัติการเลี้ยงกุ้งขาวแวนนาไมสำหรับการจัดการอาหาร คุณภาพน้ำ การสุ่มตัวอย่าง การป้องกันโรค การวางแผนจับกุ้ง และการเงินฟาร์ม",
    priority: 0.88,
    changeFrequency: "weekly",
    lastModified: TH_LAST_MODIFIED,
  },
];

export const featureSeoPages_th: SeoPage[] = [
  {
    path: "/th/shrimp-farm-management-software",
    title: "ซอฟต์แวร์จัดการฟาร์มกุ้ง | Shrimply",
    description: "Shrimply มอบแพลตฟอร์มเดียวสำหรับประสิทธิภาพของบ่อ สต็อกอาหาร คุณภาพน้ำ การสุ่มตัวอย่าง การเก็บเกี่ยว การเงิน สินทรัพย์ และการแจ้งเตือนโรค",
    priority: 0.95,
    changeFrequency: "weekly",
    lastModified: TH_LAST_MODIFIED,
  },
  {
    path: "/th/vannamei-shrimp-farming-app",
    title: "แอปเลี้ยงกุ้งขาวแวนนาไม | Shrimply",
    description: "แอปพลิเคชันมือถือและเว็บสำหรับฟาร์มกุ้งแวนนาไมเพื่อติดตามบ่อ DOC, MBW, ADG, FCR, การใช้อาหาร, คุณภาพน้ำ, อัตราการตาย และผลผลิต",
    priority: 0.9,
    changeFrequency: "weekly",
    lastModified: TH_LAST_MODIFIED,
  },
  {
    path: "/th/features/feed-inventory",
    title: "ซอฟต์แวร์ติดตามสต็อกอาหารกุ้ง | Shrimply",
    description: "ติดตามสต็อกอาหาร แบรนด์อาหาร บันทึกการให้อาหาร การสั่งซื้อล่วงหน้า และการเคลื่อนไหวของคลังสินค้าในทุกบ่อด้วย Shrimply",
    priority: 0.85,
    changeFrequency: "weekly",
    lastModified: TH_LAST_MODIFIED,
  },
  {
    path: "/th/features/water-quality-monitoring",
    title: "ซอฟต์แวร์ตรวจสอบคุณภาพน้ำในบ่อกุ้ง | Shrimply",
    description: "บันทึกและตรวจสอบแนวโน้มคุณภาพน้ำในบ่อกุ้ง รวมถึง DO, pH, อุณหภูมิ, ความเค็ม, ความเป็นด่าง, แอมโมเนีย และสัญญาณความเสี่ยง",
    priority: 0.85,
    changeFrequency: "weekly",
    lastModified: TH_LAST_MODIFIED,
  },
  {
    path: "/th/features/growth-sampling",
    title: "การสุ่มตัวอย่างการเติบโตของกุ้งและการติดตาม MBW | Shrimply",
    description: "ติดตามบันทึกการสุ่มตัวอย่างกุ้ง MBW, ADG, อัตราการตาย, มวลชีวภาพ, ประชากร และแนวโน้มการเติบโตเพื่อการตัดสินใจที่ดีขึ้น",
    priority: 0.85,
    changeFrequency: "weekly",
    lastModified: TH_LAST_MODIFIED,
  },
  {
    path: "/th/features/shrimp-harvest-tracking",
    title: "ซอฟต์แวร์ติดตามการเก็บเกี่ยวกุ้ง | Shrimply",
    description: "ติดตามน้ำหนักการเก็บเกี่ยว ขนาด ผลผลิตต่อบ่อ ผลผลิตรวมรอบเลี้ยง ความพร้อมของผู้ซื้อ และประวัติการผลิต",
    priority: 0.8,
    changeFrequency: "weekly",
    lastModified: TH_LAST_MODIFIED,
  },
  {
    path: "/th/features/shrimp-farm-finance",
    title: "การเงินและการติดตามต้นทุนฟาร์มกุ้ง | Shrimply",
    description: "เข้าใจกระแสเงินสดของฟาร์มกุ้ง ต้นทุนขาย (COGS) กำไรขาดทุน ต้นทุนอาหาร รายได้จากการเก็บเกี่ยว และการคาดการณ์ทางการเงิน",
    priority: 0.8,
    changeFrequency: "weekly",
    lastModified: TH_LAST_MODIFIED,
  },
  {
    path: "/th/features/disease-alerts",
    title: "การแจ้งเตือนโรคและซอฟต์แวร์ความปลอดภัยทางชีวภาพ | Shrimply",
    description: "Shrimply ช่วยฟาร์มติดตามการแจ้งเตือนโรค ความเสี่ยงของการระบาดใกล้เคียง สัญญาณความปลอดภัยทางชีวภาพ และสภาพบ่อที่ต้องรับมืออย่างรวดเร็ว",
    priority: 0.8,
    changeFrequency: "weekly",
    lastModified: TH_LAST_MODIFIED,
  },
];

export const resourceSeoPages_th: SeoPage[] = resourceArticlesTH.map(article => ({
  path: `/th/resources/${article.slug}`,
  title: `${article.title} | คู่มือ Shrimply`,
  description: article.description,
  priority: 0.72,
  changeFrequency: "monthly",
  lastModified: article.updatedAt ?? article.publishedAt ?? TH_LAST_MODIFIED,
}));

/* ── Vietnamese (vi) SEO pages ───────────────────────────────────── */

const VI_LAST_MODIFIED = "2026-08-23";

export const coreSeoPages_vi: SeoPage[] = [
  {
    path: "/vi",
    title: "Shrimply | Phần mềm quản lý trang trại nuôi tôm thẻ chân trắng",
    description: "Shrimply giúp các trang trại nuôi tôm theo dõi hiệu suất ao, kho thức ăn, chất lượng nước, lấy mẫu tăng trưởng, thu hoạch, tài chính và cảnh báo dịch bệnh trên một nền tảng.",
    priority: 1,
    changeFrequency: "weekly",
    lastModified: VI_LAST_MODIFIED,
  },
  {
    path: "/vi/about",
    title: "Về Shrimply | Phần mềm quản lý nuôi tôm cho đội ngũ trang trại",
    description: "Tìm hiểu lý do Shrimply được xây dựng cho người nuôi tôm cần dữ liệu ao nuôi, thức ăn, chất lượng nước, tài chính và rủi ro dịch bệnh trong một hệ điều hành duy nhất.",
    priority: 0.75,
    changeFrequency: "monthly",
    lastModified: VI_LAST_MODIFIED,
  },
  {
    path: "/vi/how-it-works",
    title: "Cách Shrimply hoạt động | Nền tảng vận hành trang trại nuôi tôm",
    description: "Xem cách Shrimply kết nối ghi chép thực địa, dữ liệu ao nuôi, kho hàng, báo cáo, tài chính, chợ tôm và thông tin chi tiết từ Orson AI.",
    priority: 0.85,
    changeFrequency: "monthly",
    lastModified: VI_LAST_MODIFIED,
  },
  {
    path: "/vi/orson",
    title: "Orson AI | Trí tuệ nhân tạo quản lý nuôi tôm cho thức ăn, tăng trưởng và rủi ro",
    description: "Orson AI giúp trang trại tôm phân tích dữ liệu ao, phản ứng thức ăn, xu hướng chất lượng nước, dữ liệu lấy mẫu và mô hình rủi ro sinh học.",
    priority: 0.8,
    changeFrequency: "monthly",
    lastModified: VI_LAST_MODIFIED,
  },
  {
    path: "/vi/download",
    title: "Tải Shrimply cho Android | Google Play",
    description: "Tải ứng dụng quản lý trang trại tôm Shrimply cho Android trên Google Play hoặc thêm ứng dụng web Shrimply vào màn hình chính iPhone.",
    priority: 0.86,
    changeFrequency: "weekly",
    lastModified: VI_LAST_MODIFIED,
  },
  {
    path: "/vi/resources",
    title: "Cẩm nang nuôi tôm & Trung tâm kiến thức Shrimply",
    description: "Cẩm nang thực hành nuôi tôm thẻ chân trắng về quản lý thức ăn, chất lượng nước, thu mẫu tăng trưởng, cảnh báo dịch bệnh, kế hoạch thu hoạch và tài chính trang trại.",
    priority: 0.88,
    changeFrequency: "weekly",
    lastModified: VI_LAST_MODIFIED,
  },
];

export const featureSeoPages_vi: SeoPage[] = [
  {
    path: "/vi/shrimp-farm-management-software",
    title: "Phần mềm quản lý trang trại nuôi tôm | Shrimply",
    description: "Shrimply cung cấp cho các trang trại nuôi tôm một nền tảng duy nhất cho hiệu suất ao, kho thức ăn, chất lượng nước, lấy mẫu, thu hoạch, tài chính, tài sản và cảnh báo dịch bệnh.",
    priority: 0.95,
    changeFrequency: "weekly",
    lastModified: VI_LAST_MODIFIED,
  },
  {
    path: "/vi/vannamei-shrimp-farming-app",
    title: "Ứng dụng nuôi tôm thẻ chân trắng Vannamei | Shrimply",
    description: "Ứng dụng di động và web cho các trang trại tôm thẻ chân trắng theo dõi ao nuôi, DOC, MBW, ADG, FCR, sử dụng thức ăn, chất lượng nước, tỷ lệ sống và sản lượng thu hoạch.",
    priority: 0.9,
    changeFrequency: "weekly",
    lastModified: VI_LAST_MODIFIED,
  },
  {
    path: "/vi/features/feed-inventory",
    title: "Phần mềm quản lý kho thức ăn tôm | Shrimply",
    description: "Theo dõi kho thức ăn, thương hiệu thức ăn, nhật ký cho ăn, nhu cầu đặt hàng và luân chuyển tồn kho trên tất cả các ao với Shrimply.",
    priority: 0.85,
    changeFrequency: "weekly",
    lastModified: VI_LAST_MODIFIED,
  },
  {
    path: "/vi/features/water-quality-monitoring",
    title: "Phần mềm giám sát chất lượng nước ao tôm | Shrimply",
    description: "Ghi lại và theo dõi xu hướng chất lượng nước ao tôm bao gồm DO, pH, nhiệt độ, độ mặn, độ kiềm, khí độc và các tín hiệu rủi ro vận hành.",
    priority: 0.85,
    changeFrequency: "weekly",
    lastModified: VI_LAST_MODIFIED,
  },
  {
    path: "/vi/features/growth-sampling",
    title: "Lấy mẫu tăng trưởng tôm và theo dõi MBW | Shrimply",
    description: "Theo dõi hồ sơ lấy mẫu tôm, MBW, ADG, tỷ lệ chết, sinh khối, quần đàn và xu hướng tăng trưởng để đưa ra quyết định tốt hơn cho vụ nuôi.",
    priority: 0.85,
    changeFrequency: "weekly",
    lastModified: VI_LAST_MODIFIED,
  },
  {
    path: "/vi/features/shrimp-harvest-tracking",
    title: "Phần mềm theo dõi thu hoạch tôm | Shrimply",
    description: "Theo dõi sản lượng thu hoạch, kích cỡ tôm, năng suất từng ao, tổng vụ nuôi, khả năng sẵn sàng của người mua và lịch sử sản xuất.",
    priority: 0.8,
    changeFrequency: "weekly",
    lastModified: VI_LAST_MODIFIED,
  },
  {
    path: "/vi/features/shrimp-farm-finance",
    title: "Tài chính và theo dõi chi phí trang trại tôm | Shrimply",
    description: "Hiểu rõ dòng tiền trang trại tôm, giá vốn hàng bán (COGS), lãi lỗ, chi phí thức ăn, doanh thu thu hoạch và dự báo tài chính.",
    priority: 0.8,
    changeFrequency: "weekly",
    lastModified: VI_LAST_MODIFIED,
  },
  {
    path: "/vi/features/disease-alerts",
    title: "Cảnh báo dịch bệnh và phần mềm an toàn sinh học | Shrimply",
    description: "Shrimply giúp trang trại theo dõi cảnh báo dịch bệnh, nguy cơ bùng phát lân cận, tín hiệu an toàn sinh học và điều kiện ao nuôi cần xử lý nhanh.",
    priority: 0.8,
    changeFrequency: "weekly",
    lastModified: VI_LAST_MODIFIED,
  },
];

export const resourceSeoPages_vi: SeoPage[] = resourceArticlesVI.map(article => ({
  path: `/vi/resources/${article.slug}`,
  title: `${article.title} | Cẩm nang Shrimply`,
  description: article.description,
  priority: 0.72,
  changeFrequency: "monthly",
  lastModified: article.updatedAt ?? article.publishedAt ?? VI_LAST_MODIFIED,
}));

export const sitemapPages = [
  ...coreSeoPages,
  ...featureSeoPages,
  ...resourceSeoPages,
  ...coreSeoPages_id,
  ...featureSeoPages_id,
  ...resourceSeoPages_id,
  ...coreSeoPages_th,
  ...featureSeoPages_th,
  ...resourceSeoPages_th,
  ...coreSeoPages_vi,
  ...featureSeoPages_vi,
  ...resourceSeoPages_vi,
];



