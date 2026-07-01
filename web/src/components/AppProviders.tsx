"use client";

import type { ReactNode } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { LanguageCurrencySync } from "@/contexts/LanguageCurrencySync";
import { LanguageProvider } from "@/contexts/LanguageContext";

export default function AppProviders({ children }: { children: ReactNode }) {
  return (
    <LanguageProvider>
      <CurrencyProvider>
        <AuthProvider>
          <LanguageCurrencySync />
          {children}
        </AuthProvider>
      </CurrencyProvider>
    </LanguageProvider>
  );
}
