import type { ReactNode } from "react";
import { coreSeoPages_id, seoMetadataID } from "@/config/seo";

const page = coreSeoPages_id.find(item => item.path === "/id/about");

export const metadata = seoMetadataID(page!, "/about");

export default function AboutLayoutID({ children }: { children: ReactNode }) {
  return children;
}
