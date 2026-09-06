import type { Metadata, Viewport } from "next";
import "./globals.css";
import "@/components/landing/public-theme.css";
import "@/components/landing/ocean-home.css";
import PublicTheme from "@/components/landing/PublicTheme";
import { SITE_CONFIG } from "@/config/site";
import MetaPixel from "@/components/MetaPixel";
import PortalProviders from "@/components/PortalProviders";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0F4C75",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_CONFIG.url),
  title: {
    default: SITE_CONFIG.title,
    template: "%s | Shrimply",
  },
  description: SITE_CONFIG.description,
  applicationName: SITE_CONFIG.name,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: SITE_CONFIG.name,
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
  },
  keywords: [...SITE_CONFIG.keywords],
  authors: [{ name: "Shrimply Technologies" }],
  creator: "Shrimply Technologies",
  publisher: "Shrimply Technologies",
  openGraph: {
    title: SITE_CONFIG.title,
    description: SITE_CONFIG.description,
    url: "/",
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
    title: SITE_CONFIG.title,
    description: SITE_CONFIG.description,
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
  verification: {
    other: {
      "msvalidate.01": "0AB9EEC142DFB0FE255B043BB8171B6E",
    },
  },
  icons: {
    icon: [
      { url: SITE_CONFIG.icons.favicon },
      { url: SITE_CONFIG.icons.favicon48, sizes: "48x48", type: "image/png" },
      { url: SITE_CONFIG.icons.icon192, sizes: "192x192", type: "image/png" },
    ],
    shortcut: SITE_CONFIG.icons.favicon,
    apple: SITE_CONFIG.icons.apple,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <PortalProviders>
          <div className="main-container">
            <PublicTheme>{children}</PublicTheme>
          </div>
        </PortalProviders>
        <MetaPixel />
        <noscript
          dangerouslySetInnerHTML={{
            __html: '<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=1946977685993378&ev=PageView&noscript=1" alt="" />',
          }}
        />
      </body>
    </html>
  );
}
