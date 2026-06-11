import SeoLandingPage from "@/components/SeoLandingPage";
import { featureSeoPages, seoMetadata } from "@/config/seo";

const page = featureSeoPages.find(item => item.path === "/vannamei-shrimp-farming-app");

export const metadata = seoMetadata(page!);

export default function VannameiShrimpFarmingAppPage() {
  return (
    <SeoLandingPage
      eyebrow="Vannamei Shrimp Farming App"
      title="A vannamei shrimp farming app for pond teams that need reliable field data."
      intro="Shrimply helps vannamei farms capture the data that matters during a crop cycle, from pond setup and daily checks to growth sampling, feed use, mortality, harvests, and reports."
      sections={[
        {
          title: "Track the full crop cycle",
          body: "Keep DOC, stocking, MBW, population, mortality, feed, water quality, harvest, and finance data connected so teams can review the whole cycle without manual reconciliation.",
        },
        {
          title: "Mobile and web workflows",
          body: "Field teams can log operational data from mobile while managers review performance from the web dashboard. The same farm records stay aligned across the Shrimply ecosystem.",
        },
        {
          title: "Useful for daily decisions",
          body: "Vannamei farming needs fast feedback. Shrimply helps teams spot missing records, appetite changes, growth variation, water quality movement, and disease-risk signals earlier.",
        },
      ]}
      related={[
        { href: "/", label: "Homepage" },
        { href: "/shrimp-farm-management-software", label: "Farm Software" },
        { href: "/resources", label: "Education Hub" },
        { href: "/how-it-works", label: "How It Works" },
      ]}
    />
  );
}
