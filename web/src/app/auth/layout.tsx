import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import AppProviders from "@/components/AppProviders";

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
    <AppProviders>
      <Suspense fallback={<main className="auth-shell" aria-busy="true" aria-label="Loading authentication" />}>
        {children}
      </Suspense>
    </AppProviders>
  );
}
