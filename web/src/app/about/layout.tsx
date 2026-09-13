import "@/app/globals.css";
import type { ReactNode } from "react";
import { coreSeoPages, seoMetadata } from "@/config/seo";

const page = coreSeoPages.find(item => item.path === "/about");

export const metadata = seoMetadata(page!);

export default function AboutLayout({ children }: { children: ReactNode }) {
  return children;
}
