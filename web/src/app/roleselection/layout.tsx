import "@/app/globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Select Shrimply Role",
  description: "Choose your Shrimply workspace role.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function RoleSelectionLayout({ children }: { children: ReactNode }) {
  return children;
}
