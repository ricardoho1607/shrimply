import "@/app/globals.css";
import type { ReactNode } from "react";
import { coreSeoPages_th, seoMetadataTH } from "@/config/seo";

const page = coreSeoPages_th.find(item => item.path === "/th/how-it-works");

export const metadata = seoMetadataTH(page!, "/how-it-works");

export default function HowItWorksLayoutTH({ children }: { children: ReactNode }) {
  return children;
}
