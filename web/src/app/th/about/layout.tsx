import "@/app/globals.css";
import type { ReactNode } from "react";
import { coreSeoPages_th, seoMetadataTH } from "@/config/seo";

const page = coreSeoPages_th.find(item => item.path === "/th/about");

export const metadata = seoMetadataTH(page!, "/about");

export default function AboutLayoutTH({ children }: { children: ReactNode }) {
  return children;
}
