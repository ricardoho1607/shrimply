"use client";

import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { getRequiredSetupRoute, ROUTES } from "@/config/routes";

type OnboardingStage = "role" | "setup";

export function useOnboardingGuard(stage: OnboardingStage) {
  const { isAuthenticated, needsRoleSelection, needsSetup, loading, companyLoading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading || companyLoading) return;

    if (!isAuthenticated) {
      router.replace(ROUTES.auth);
      return;
    }

    if (stage === "role") {
      if (!needsRoleSelection) {
        router.replace(needsSetup ? getRequiredSetupRoute(user?.role) : ROUTES.dashboard);
        return;
      }

      return;
    }

    if (needsRoleSelection) {
      router.replace(ROUTES.roleSelection);
      return;
    }

    if (!needsSetup) {
      router.replace(ROUTES.dashboard);
    }
  }, [companyLoading, isAuthenticated, loading, needsRoleSelection, needsSetup, router, stage, user?.role]);

  if (loading || companyLoading || !isAuthenticated) return false;
  if (stage === "role") return needsRoleSelection;
  return !needsRoleSelection && needsSetup;
}

export function OnboardingLoading() {
  return (
    <main style={{
      minHeight: "100vh",
      background: "var(--bg-dark)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "var(--primary)",
    }}>
      <Loader2 className="animate-spin" size={44} />
    </main>
  );
}
