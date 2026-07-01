import type { Metadata } from "next";
import type { ReactNode } from "react";
import AppProviders from "@/components/AppProviders";

export const metadata: Metadata = {
  title: "Select Shrimply Role",
  description: "Choose your Shrimply workspace role.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function RoleSelectionLayout({ children }: { children: ReactNode }) {
  return <AppProviders>{children}</AppProviders>;
}
