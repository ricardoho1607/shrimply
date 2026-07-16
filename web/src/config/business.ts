export type BusinessSize = "small" | "medium" | "large";

export const BUSINESS_SIZES: BusinessSize[] = ["small", "medium", "large"];

export const DEFAULT_COMPANY_SETUP = {
  companyName: "",
  primaryLocation: "",
  farmType: "",
  businessSize: "medium" as BusinessSize,
  description: "",
  contactPhone: "",
  isPublicProfile: true,
  timeZone: "",
};

export const BUYER_INTEREST_OPTIONS = [
  "Vannamei Shrimp",
  "Black Tiger Shrimp",
  "Freshwater Prawn",
  "Organic Certified",
  "Bulk Procurement",
  "High Survival Rate",
] as const;
