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
    path: "/assets/og-image.jpg",
    width: 1200,
    height: 630,
    alt: "Shrimply shrimp farm management software",
  },
  icons: {
    favicon: "/favicon.ico",
    apple: "/shrimplylogo_v2.png",
  },
} as const;
