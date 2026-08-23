import type { ReactNode } from "react";
import { coreSeoPages_vi, seoMetadataVI } from "@/config/seo";

const page = coreSeoPages_vi.find(item => item.path === "/vi/how-it-works");

export const metadata = seoMetadataVI(page!, "/how-it-works");

export default function HowItWorksLayoutVI({ children }: { children: ReactNode }) {
  return children;
}
