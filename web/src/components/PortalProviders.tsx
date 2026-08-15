"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import AppProviders from "@/components/AppProviders";

const PROVIDER_ROUTES = [
  "/auth",
  "/dashboard",
  "/roleselection",
  "/setup",
  "/admin",
  "/download",
] as const;

const usesPortalProviders = (pathname: string) => PROVIDER_ROUTES.some(
  (route) => pathname === route || pathname.startsWith(`${route}/`),
);

export default function PortalProviders({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return usesPortalProviders(pathname) ? <AppProviders>{children}</AppProviders> : children;
}
