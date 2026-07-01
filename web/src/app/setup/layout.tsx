import type { Metadata } from "next";
import type { ReactNode } from "react";
import AppProviders from "@/components/AppProviders";

export const metadata: Metadata = {
  title: "Shrimply Setup",
  description: "Complete your Shrimply workspace setup.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function SetupLayout({ children }: { children: ReactNode }) {
  return <AppProviders>{children}</AppProviders>;
}
