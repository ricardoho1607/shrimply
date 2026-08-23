import type { ReactNode } from "react";
import { coreSeoPages_id, seoMetadataID } from "@/config/seo";

const page = coreSeoPages_id.find(item => item.path === "/id/how-it-works");

export const metadata = seoMetadataID(page!, "/how-it-works");

export default function HowItWorksLayoutID({ children }: { children: ReactNode }) {
  return children;
}
