"use client";

import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { ROUTES } from "@/config/routes";

type OnboardingStage = "role" | "setup";

export function useOnboardingGuard(stage: OnboardingStage) {
  const { isAuthenticated, needsRoleSelection, needsSetup, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!isAuthenticated) {
      router.replace(ROUTES.auth);
      return;
    }

    if (stage === "role") {
      if (!needsRoleSelection) {
        router.replace(needsSetup ? ROUTES.setupChoice : ROUTES.dashboard);
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
  }, [isAuthenticated, loading, needsRoleSelection, needsSetup, router, stage]);

  if (loading || !isAuthenticated) return false;
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
