import SeoLandingPage from "@/components/SeoLandingPage";
import { featureSeoPages, seoMetadata } from "@/config/seo";

const page = featureSeoPages.find(item => item.path === "/features/feed-inventory");

export const metadata = seoMetadata(page!);

export default function FeedInventoryPage() {
  return (
    <SeoLandingPage
      path="/features/feed-inventory"
      eyebrow="Feed Inventory"
      title="Shrimp feed inventory tracking for farms that need accurate stock and feeding records."
      intro="Shrimply helps farms track feed stock, feed brands, feeding activity, reorder needs, and inventory movement so feed decisions are tied to real pond operations."
      sections={[
        {
          title: "Know what feed is available",
          body: "Track feed brands and stock movement in one place so managers can see what is available before a feeding plan creates a shortage.",
        },
        {
          title: "Separate feeding from sampling",
          body: "Feeding records represent real inventory activity. Sampling feed amounts are biological observations for FCR and projections, so Shrimply keeps those workflows distinct.",
        },
        {
          title: "Connect feed use to performance",
          body: "When feed activity is connected to growth, biomass, mortality, and harvest outcomes, farms get a clearer view of FCR and cycle economics.",
        },
        {
          title: "Catch stockout risk earlier",
          body: "Feed shortages are easier to prevent when reorder decisions are based on stock on hand, pond demand, and recent feeding activity instead of memory.",
        },
        {
          title: "Keep feed accountability clear",
          body: "Farm teams can review which feed was issued, where it was used, and how that movement relates to pond performance and inventory value.",
        },
      ]}
      checklist={[
        "Track feed brands, bag counts, and stock movement before issuing feed to ponds.",
        "Record feeding activity as the inventory action that deducts stock.",
        "Keep sampling feed observations separate from inventory deductions.",
        "Review feed use beside biomass, FCR, mortality, and harvest results.",
        "Use reorder visibility before feed shortages interrupt the culture plan.",
      ]}
      faqs={[
        {
          question: "Does Shrimply deduct inventory from sampling records?",
          answer: "No. Feeding records represent real inventory activity and deduct feed stock. Sampling feed amounts are biological observations for FCR and projection context.",
        },
        {
          question: "Why does feed inventory matter for shrimp farm FCR?",
          answer: "FCR depends on accurate feed-use records. If feed movement is guessed or missing, the farm cannot reliably compare feed used against biomass gain.",
        },
        {
          question: "Can managers review feed stock before planning pond feeding?",
          answer: "Yes. The workflow is designed so managers can connect available stock, feed brands, feeding activity, and pond demand before shortages become operational problems.",
        },
      ]}
      related={[
        { href: "/", label: "Homepage" },
        { href: "/shrimp-farm-management-software", label: "Farm Software" },
        { href: "/features/growth-sampling", label: "Growth Sampling" },
        { href: "/resources/feed-inventory-control", label: "Feed Inventory Guide" },
        { href: "/resources", label: "Education Hub" },
        { href: "/how-it-works", label: "How It Works" },
      ]}
    />
  );
}
