import type { ReactNode } from "react";
import { coreSeoPages, seoMetadata } from "@/config/seo";

const page = coreSeoPages.find(item => item.path === "/orson");

export const metadata = seoMetadata(page!);

export default function OrsonLayout({ children }: { children: ReactNode }) {
  return children;
}
