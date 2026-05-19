"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { ROUTES } from "@/config/routes";

type OnboardingStage = "role" | "setup";

export function useOnboardingGuard(stage: OnboardingStage) {
  const { isAuthenticated, needsRoleSelection, needsSetup, loading } = useAuth();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (loading) return;

    if (!isAuthenticated) {
      setReady(false);
      router.replace(ROUTES.auth);
      return;
    }

    if (stage === "role") {
      if (!needsRoleSelection) {
        setReady(false);
        router.replace(needsSetup ? ROUTES.setupChoice : ROUTES.dashboard);
        return;
      }

      setReady(true);
      return;
    }

    if (needsRoleSelection) {
      setReady(false);
      router.replace(ROUTES.roleSelection);
      return;
    }

    if (!needsSetup) {
      setReady(false);
      router.replace(ROUTES.dashboard);
      return;
    }

    setReady(true);
  }, [isAuthenticated, loading, needsRoleSelection, needsSetup, router, stage]);

  return ready;
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
