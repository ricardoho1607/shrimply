import SeoLandingPage from "@/components/SeoLandingPage";
import { featureSeoPages, seoMetadata } from "@/config/seo";

const page = featureSeoPages.find(item => item.path === "/features/feed-inventory");

export const metadata = seoMetadata(page!);

export default function FeedInventoryPage() {
  return (
    <SeoLandingPage
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
