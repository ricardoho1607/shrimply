import SeoLandingPage from "@/components/SeoLandingPage";
import { featureSeoPages, seoMetadata } from "@/config/seo";

const page = featureSeoPages.find(item => item.path === "/features/shrimp-harvest-tracking");

export const metadata = seoMetadata(page!);

export default function ShrimpHarvestTrackingPage() {
  return (
    <SeoLandingPage
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
      ]}
      related={[
        { href: "/", label: "Homepage" },
        { href: "/resources", label: "Education Hub" },
        { href: "/shrimp-farm-management-software", label: "Farm Software" },
        { href: "/how-it-works", label: "How It Works" },
      ]}
    />
  );
}
