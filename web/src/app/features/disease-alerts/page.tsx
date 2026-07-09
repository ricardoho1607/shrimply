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
        { href: "/shrimp-farm-management-software", label: "Shrimp farm management software", description: "See how disease-risk visibility fits into pond operations and reporting." },
        { href: "/features/water-quality-monitoring", label: "Water quality monitoring", description: "Review pond conditions that can strengthen disease-risk and stress interpretation." },
        { href: "/features/growth-sampling", label: "Growth sampling and mortality tracking", description: "Connect disease alerts with growth movement, appetite, and mortality records." },
        { href: "/resources/shrimp-disease-alerts", label: "Shrimp disease alert guide", description: "Read how alert context supports faster farm response and biosecurity review." },
        { href: "/resources/white-feces-disease-shrimp", label: "White feces disease guide", description: "Learn how symptoms, feed response, and pond records can support disease review." },
        { href: "/orson", label: "Orson AI for risk analysis", description: "See how Orson uses recent pond records to interpret growth, feed, water, and disease signals." },
      ]}
    />
  );
}
