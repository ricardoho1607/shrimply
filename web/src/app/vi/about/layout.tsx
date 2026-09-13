import "@/app/globals.css";
import type { ReactNode } from "react";
import { coreSeoPages_vi, seoMetadataVI } from "@/config/seo";

const page = coreSeoPages_vi.find(item => item.path === "/vi/about");

export const metadata = seoMetadataVI(page!, "/about");

export default function AboutLayoutVI({ children }: { children: ReactNode }) {
  return children;
}
