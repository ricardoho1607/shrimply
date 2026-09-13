import "@/app/globals.css";
import type { ReactNode } from "react";
import { coreSeoPages, seoMetadata } from "@/config/seo";

const page = coreSeoPages.find(item => item.path === "/how-it-works");

export const metadata = seoMetadata(page!);

export default function HowItWorksLayout({ children }: { children: ReactNode }) {
  return children;
}
