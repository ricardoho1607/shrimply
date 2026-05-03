export const SITE_CONFIG = {
  name: "Shrimply",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://shrimply.tech",
  title: "Shrimply | Intelligent Aquaculture",
  description: "Manage your shrimp farm with AI-powered insights and real-time data.",
  keywords: ["shrimp farming", "aquaculture", "farm management", "pond monitoring", "Orson AI"],
  ogImage: {
    path: "/assets/hero.png",
    width: 1200,
    height: 630,
    alt: "Shrimply aquaculture intelligence platform",
  },
  icons: {
    favicon: "/favicon.ico",
    apple: "/shrimplylogo_v2.png",
  },
} as const;
