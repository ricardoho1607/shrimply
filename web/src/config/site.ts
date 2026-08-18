export const GOOGLE_PLAY_URL = "https://play.google.com/store/apps/details?id=com.shrimply.tech.investashrimp";

export const SITE_CONFIG = {
  name: "Shrimply",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://www.shrimplytech.com",
  title: "Shrimply | Shrimp Farm Management Software for Vannamei Farms",
  description: "Shrimply helps shrimp farms track pond performance, feed inventory, water quality, growth sampling, harvests, finance, assets, and disease alerts in one platform.",
  keywords: [
    "shrimp farm management software",
    "vannamei shrimp farming app",
    "aquaculture software",
    "shrimp pond management",
    "feed inventory tracking",
    "water quality monitoring",
    "growth sampling",
    "shrimp harvest tracking",
    "shrimp farm finance",
    "disease alerts",
    "Orson AI",
  ],
  ogImage: {
    path: "/assets/og-image.png",
    width: 1200,
    height: 630,
    alt: "Shrimply shrimp farm management software",
  },
  icons: {
    favicon: "/favicon.ico",
    favicon48: "/favicon-48x48.png",
    icon192: "/icon-192.png",
    apple: "/apple-touch-icon.png",
  },
} as const;
