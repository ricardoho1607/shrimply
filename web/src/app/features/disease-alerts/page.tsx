import SeoLandingPage from "@/components/SeoLandingPage";
import { featureSeoPages, seoMetadata } from "@/config/seo";

const page = featureSeoPages.find(item => item.path === "/features/disease-alerts");

export const metadata = seoMetadata(page!);

export default function DiseaseAlertsPage() {
  return (
    <SeoLandingPage
      path="/features/disease-alerts"
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
        {
          title: "Make response steps easier to prioritize",
          body: "Biosecurity decisions are easier when alerts are reviewed with pond-specific risk context instead of being treated as isolated notifications.",
        },
        {
          title: "Support records for future prevention",
          body: "Keeping alert, mortality, water quality, and pond response history together helps farms learn from risk events after the immediate pressure passes.",
        },
      ]}
      checklist={[
        "Review disease alerts beside pond water quality, appetite, mortality, and growth movement.",
        "Keep private company data out of buyer-facing or public views unless intentionally shared.",
        "Record response steps so future prevention reviews have context.",
        "Prioritize ponds with both external alerts and internal stress signals.",
        "Use disease history to strengthen biosecurity planning after the event.",
      ]}
      faqs={[
        {
          question: "Are disease alerts a replacement for farm diagnosis?",
          answer: "No. Alerts support faster awareness and response planning, but farms should still use appropriate diagnostics, local expertise, and biosecurity procedures.",
        },
        {
          question: "Why connect alerts with pond records?",
          answer: "A disease alert is more useful when managers can compare it with water quality, appetite, mortality, growth, and recent pond observations.",
        },
        {
          question: "How does Shrimply protect private farm data?",
          answer: "Shrimply is designed around company ownership and privacy-aware workflows so internal farm records are not exposed to buyer-facing views unless that is explicitly intended.",
        },
      ]}
      related={[
        { href: "/", label: "Homepage" },
        { href: "/resources", label: "Education Hub" },
        { href: "/shrimp-farm-management-software", label: "Farm Software" },
        { href: "/features/water-quality-monitoring", label: "Water Quality" },
        { href: "/resources/shrimp-disease-alerts", label: "Disease Alert Guide" },
        { href: "/orson", label: "Orson AI" },
      ]}
    />
  );
}
