import SeoLandingPage from "@/components/SeoLandingPage";
import { featureSeoPages, seoMetadata } from "@/config/seo";

const page = featureSeoPages.find(item => item.path === "/features/disease-alerts");

export const metadata = seoMetadata(page!);

export default function DiseaseAlertsPage() {
  return (
    <SeoLandingPage
      eyebrow="Disease Alerts"
      title="Shrimp disease alerts and biosecurity visibility for faster farm response."
      intro="Shrimply helps farms track disease alerts, nearby outbreak risk, biosecurity signals, and pond conditions that deserve faster operational attention."
      sections={[
        {
          title: "Earlier biosecurity awareness",
          body: "Disease risk can spread quickly across farming areas. Shrimply helps teams see warning signals earlier so they can prepare before losses escalate.",
        },
        {
          title: "Private, practical risk context",
          body: "Disease visibility should support farm safety without exposing private company data. Shrimply is designed around privacy-aware biosecurity workflows.",
        },
        {
          title: "Connect alerts to pond conditions",
          body: "Disease alerts are more useful when viewed alongside water quality, appetite, growth, and mortality trends. Shrimply keeps those signals close together.",
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
