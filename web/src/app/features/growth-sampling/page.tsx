import SeoLandingPage from "@/components/SeoLandingPage";
import { featureSeoPages, seoMetadata } from "@/config/seo";

const page = featureSeoPages.find(item => item.path === "/features/growth-sampling");

export const metadata = seoMetadata(page!);

export default function GrowthSamplingPage() {
  return (
    <SeoLandingPage
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
      ]}
      related={[
        { href: "/", label: "Homepage" },
        { href: "/vannamei-shrimp-farming-app", label: "Vannamei App" },
        { href: "/resources", label: "Education Hub" },
        { href: "/how-it-works", label: "How It Works" },
      ]}
    />
  );
}
