import type { ReactNode } from "react";
import AppProviders from "@/components/AppProviders";

export default function DownloadLayout({ children }: { children: ReactNode }) {
  return <AppProviders>{children}</AppProviders>;
}
