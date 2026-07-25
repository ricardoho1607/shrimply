import { resourceArticles } from "@/data/resourceLibrary";
import { getSetupDestination, type OnboardingRole } from "../../../shared/onboarding";

export const ROUTES = {
  home: "/",
  auth: "/auth",
  join: "/auth/join",
  dashboard: "/dashboard",
  roleSelection: "/roleselection",
  setupChoice: "/setup/choice",
  setupCompany: "/setup/company",
  setupBuyer: "/setup/buyer",
  setupSearch: "/setup/search",
  dashboardCompany: "/dashboard/company",
  dashboardSettings: "/dashboard/settings",
  dashboardPonds: "/dashboard/ponds",
  dashboardWater: "/dashboard/water",
  dashboardFeed: "/dashboard/feed",
  publicPages: [
    "/",
    "/about",
    "/how-it-works",
    "/download",
    "/resources",
    "/orson",
    "/auth",
    "/auth/join",
    "/shrimp-farm-management-software",
    "/vannamei-shrimp-farming-app",
    "/features/feed-inventory",
    "/features/water-quality-monitoring",
    "/features/growth-sampling",
    "/features/shrimp-harvest-tracking",
    "/features/shrimp-farm-finance",
    "/features/disease-alerts",
    ...resourceArticles.map(article => `/resources/${article.slug}`),
  ],
  privatePrefixes: ["/dashboard", "/roleselection", "/setup"],
} as const;

export type AppRoute = typeof ROUTES[keyof typeof ROUTES];

export const getRequiredSetupRoute = (role?: string | null): string => {
  const destination = getSetupDestination(role as OnboardingRole | undefined);
  if (destination === 'company') return ROUTES.setupCompany;
  if (destination === 'buyer') return ROUTES.setupBuyer;
  if (destination === 'join') return ROUTES.setupSearch;
  return ROUTES.roleSelection;
};
