import SeoLandingPage from "@/components/SeoLandingPage";
import { featureSeoPages, seoMetadata } from "@/config/seo";

const page = featureSeoPages.find(item => item.path === "/features/water-quality-monitoring");

export const metadata = seoMetadata(page!);

export default function WaterQualityMonitoringPage() {
  return (
    <SeoLandingPage
      eyebrow="Water Quality Monitoring"
      title="Shrimp pond water quality monitoring for cleaner daily risk visibility."
      intro="Shrimply helps farms record and review water quality trends so pond teams can connect DO, pH, temperature, salinity, alkalinity, ammonia, and other readings to farm decisions."
      sections={[
        {
          title: "Turn checks into trends",
          body: "Single readings are useful, but trend direction matters. Shrimply keeps water quality history available so teams can review movement across recent records.",
        },
        {
          title: "Connect water quality to growth",
          body: "When new sampling records are created, water quality history helps explain growth variation, appetite changes, stress, or unexpected pond performance.",
        },
        {
          title: "Support faster response",
          body: "Clean water quality records make it easier to see which ponds need attention, which conditions are stable, and where a biological warning may be emerging.",
        },
      ]}
      related={[
        { href: "/", label: "Homepage" },
        { href: "/resources", label: "Education Hub" },
        { href: "/shrimp-farm-management-software", label: "Farm Software" },
        { href: "/orson", label: "Orson AI" },
      ]}
    />
  );
}
