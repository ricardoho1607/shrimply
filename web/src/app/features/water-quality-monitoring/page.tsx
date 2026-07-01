import SeoLandingPage from "@/components/SeoLandingPage";
import { featureSeoPages, seoMetadata } from "@/config/seo";

const page = featureSeoPages.find(item => item.path === "/features/water-quality-monitoring");

export const metadata = seoMetadata(page!);

export default function WaterQualityMonitoringPage() {
  return (
    <SeoLandingPage
      path="/features/water-quality-monitoring"
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
        {
          title: "Review recent history, not one isolated reading",
          body: "Shrimply keeps recent water quality history close to the pond record so managers can see whether a reading is a one-off issue or part of a trend.",
        },
        {
          title: "Give Orson stronger context",
          body: "Water quality history improves AI pond analysis because growth, appetite, and risk signals make more sense when recent environmental movement is available.",
        },
      ]}
      checklist={[
        "Record DO, pH, temperature, salinity, alkalinity, ammonia, and other farm-specific readings consistently.",
        "Review trend direction across recent records before deciding a pond is stable.",
        "Compare water quality movement with MBW, ADG, appetite, and mortality.",
        "Flag ponds with repeated abnormal readings for faster manager review.",
        "Use water quality history when explaining growth changes between samplings.",
      ]}
      faqs={[
        {
          question: "Why track water quality trends instead of only today's reading?",
          answer: "A single reading can be useful, but trend direction shows whether the pond is improving, worsening, or repeatedly crossing a risk threshold.",
        },
        {
          question: "How does water quality connect to sampling results?",
          answer: "When a new sampling is created, recent water quality history helps explain growth variation, appetite changes, stress, or abnormal pond performance.",
        },
        {
          question: "Can Shrimply help compare risk across ponds?",
          answer: "Yes. Keeping water quality records organized by pond and cycle helps teams review which ponds are stable and which need faster operational attention.",
        },
      ]}
      related={[
        { href: "/", label: "Homepage" },
        { href: "/resources", label: "Education Hub" },
        { href: "/shrimp-farm-management-software", label: "Farm Software" },
        { href: "/features/disease-alerts", label: "Disease Alerts" },
        { href: "/resources/water-quality-trends", label: "Water Quality Guide" },
        { href: "/orson", label: "Orson AI" },
      ]}
    />
  );
}
