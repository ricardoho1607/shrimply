import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Shrimply Setup",
  description: "Complete your Shrimply workspace setup.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function SetupLayout({ children }: { children: ReactNode }) {
  return children;
}
