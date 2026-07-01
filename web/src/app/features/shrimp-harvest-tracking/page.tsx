import SeoLandingPage from "@/components/SeoLandingPage";
import { featureSeoPages, seoMetadata } from "@/config/seo";

const page = featureSeoPages.find(item => item.path === "/features/shrimp-harvest-tracking");

export const metadata = seoMetadata(page!);

export default function ShrimpHarvestTrackingPage() {
  return (
    <SeoLandingPage
      path="/features/shrimp-harvest-tracking"
      eyebrow="Harvest Tracking"
      title="Shrimp harvest tracking software for pond outcomes and production history."
      intro="Shrimply helps farms track harvest weights, sizes, pond outcomes, cycle totals, and production history so owners can understand what each pond actually produced."
      sections={[
        {
          title: "Record harvest outcomes",
          body: "Track harvested weight, size, and pond-level results so each cycle ends with clear production data instead of scattered notes.",
        },
        {
          title: "Connect harvests to population",
          body: "Harvest records affect the remaining pond population and final cycle performance, so Shrimply keeps harvests connected to pond calculations and reports.",
        },
        {
          title: "Improve buyer readiness",
          body: "Clear harvest records help farms understand availability, average size, and production history when planning sales or marketplace visibility.",
        },
        {
          title: "Account for partial harvests",
          body: "Partial harvests change remaining pond population and biomass interpretation, so harvest activity should stay tied to the active cycle record.",
        },
        {
          title: "Close the loop on cycle performance",
          body: "Harvest data completes the production story by connecting stocking, feed use, sampling, mortality, water quality, costs, and final output.",
        },
      ]}
      checklist={[
        "Record harvested weight, size, date, pond, and harvest type.",
        "Separate partial harvests from final harvests when reviewing cycle results.",
        "Update population and biomass context after harvest activity.",
        "Connect harvest results to feed, sampling, mortality, and finance reports.",
        "Keep buyer readiness and sale planning tied to current production records.",
      ]}
      faqs={[
        {
          question: "Why do partial harvest records matter?",
          answer: "Partial harvests remove biomass and animals from the pond before the cycle ends. If they are missing, FCR, biomass, population, and profitability can be distorted.",
        },
        {
          question: "What should a shrimp farm record during harvest?",
          answer: "The farm should record pond, date, harvested weight, size, harvest type, buyer or sale context where applicable, and notes that explain the outcome.",
        },
        {
          question: "How does harvest tracking help reports?",
          answer: "Harvest records connect production output to feed use, mortality, sampling, costs, and revenue so owners can review the full crop-cycle result.",
        },
      ]}
      related={[
        { href: "/", label: "Homepage" },
        { href: "/resources", label: "Education Hub" },
        { href: "/shrimp-farm-management-software", label: "Farm Software" },
        { href: "/features/shrimp-farm-finance", label: "Farm Finance" },
        { href: "/resources/shrimp-harvest-tracking", label: "Harvest Guide" },
        { href: "/how-it-works", label: "How It Works" },
      ]}
    />
  );
}
