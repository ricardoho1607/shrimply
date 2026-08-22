"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Script from "next/script";

const META_PIXEL_ID = "1946977685993378";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

function trackPage(pathname: string) {
  window.fbq?.("track", "PageView");

  if (pathname === "/download") {
    window.fbq?.("track", "ViewContent", {
      content_name: "Shrimply Download Page",
    });
  }
}

export function trackMetaDownloadClick() {
  window.fbq?.("trackCustom", "DownloadClick", {
    destination: "Google Play",
  });
}

export default function MetaPixel() {
  const pathname = usePathname();
  const isInitialPage = useRef(true);

  useEffect(() => {
    if (isInitialPage.current) {
      isInitialPage.current = false;
      return;
    }

    trackPage(pathname);
  }, [pathname]);

  return (
    <Script id="meta-pixel" strategy="afterInteractive">
      {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${META_PIXEL_ID}');fbq('track','PageView');if(window.location.pathname==='/download'){fbq('track','ViewContent',{content_name:'Shrimply Download Page'});}`}
    </Script>
  );
}
