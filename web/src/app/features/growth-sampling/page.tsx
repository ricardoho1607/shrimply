import SeoLandingPage from "@/components/SeoLandingPage";
import { featureSeoPages, seoMetadata } from "@/config/seo";

const page = featureSeoPages.find(item => item.path === "/features/growth-sampling");

export const metadata = seoMetadata(page!);

export default function GrowthSamplingPage() {
  return (
    <SeoLandingPage
      path="/features/growth-sampling"
      eyebrow="Growth Sampling"
      title="Shrimp growth sampling software for MBW, ADG, biomass, and mortality tracking."
      intro="Shrimply helps farms track growth sampling records, MBW, mortality, feed observations, biomass, population, ADG, and FCR indicators without treating sampling as an inventory deduction."
      sections={[
        {
          title: "Track MBW and growth direction",
          body: "Sampling records help teams understand whether shrimp are growing as expected. Shrimply keeps MBW and related growth history organized by pond and cycle.",
        },
        {
          title: "Better projections from better data",
          body: "Reliable sampling improves biomass estimates, feed planning, harvest timing, and financial projections. Missing or weak data becomes easier to identify.",
        },
        {
          title: "Designed for farm reality",
          body: "Farm data can be fragmented. Shrimply uses defensive calculations and practical fallbacks so reports stay useful without pretending missing records are perfect.",
        },
        {
          title: "Protect projections from weak assumptions",
          body: "Sampling quality affects biomass estimates, feed planning, and harvest timing, so Shrimply keeps data quality visible when calculations depend on limited records.",
        },
        {
          title: "Connect growth to water and feeding history",
          body: "Sampling is more useful when reviewed with recent feed response and water quality movement instead of being treated as an isolated number.",
        },
      ]}
      checklist={[
        "Store MBW and feed observations as numbers for reliable calculations.",
        "Use recent valid MBW records when the latest sampling is missing or zero.",
        "Review ADG, biomass, survival, mortality, and FCR together.",
        "Keep sampling feed amounts separate from inventory deductions.",
        "Compare new sampling results against recent water quality and feeding history.",
      ]}
      faqs={[
        {
          question: "Does growth sampling deduct feed inventory?",
          answer: "No. Sampling feed amount is used for biological context, FCR, and projections. Actual feed inventory is deducted only through feeding activity.",
        },
        {
          question: "What sampling fields matter most for shrimp pond decisions?",
          answer: "MBW, mortality, feed observation, population, biomass, ADG, and FCR context help managers understand growth direction and harvest readiness.",
        },
        {
          question: "How does Shrimply handle fragmented sampling data?",
          answer: "Shrimply uses defensive calculation logic and practical fallbacks so reports can remain useful while still making missing or weak data visible.",
        },
      ]}
      related={[
        { href: "/", label: "Homepage" },
        { href: "/vannamei-shrimp-farming-app", label: "Vannamei App" },
        { href: "/features/feed-inventory", label: "Feed Inventory" },
        { href: "/features/water-quality-monitoring", label: "Water Quality" },
        { href: "/resources", label: "Education Hub" },
        { href: "/how-it-works", label: "How It Works" },
      ]}
    />
  );
}
