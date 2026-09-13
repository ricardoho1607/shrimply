import "@/app/globals.css";
import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";

export const metadata: Metadata = {
  title: "Shrimply Login",
  description: "Sign in to Shrimply.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<main className="auth-shell" aria-busy="true" aria-label="Loading authentication" />}>
      {children}
    </Suspense>
  );
}
