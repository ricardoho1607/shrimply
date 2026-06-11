import SeoLandingPage from "@/components/SeoLandingPage";
import { featureSeoPages, seoMetadata } from "@/config/seo";

const page = featureSeoPages.find(item => item.path === "/features/shrimp-farm-finance");

export const metadata = seoMetadata(page!);

export default function ShrimpFarmFinancePage() {
  return (
    <SeoLandingPage
      eyebrow="Shrimp Farm Finance"
      title="Shrimp farm finance tracking for cash flow, COGS, P&L, and projections."
      intro="Shrimply helps farms organize financial records and reports across cash flow, cost of goods sold, profit and loss, inventory costs, harvest revenue, and assumption-based projections."
      sections={[
        {
          title: "Separate the right reports",
          body: "Cash flow, COGS, profit and loss, and projections answer different questions. Shrimply keeps those report types clear instead of mixing them into one vague export.",
        },
        {
          title: "Tie costs to operations",
          body: "Feed, inventory, harvest, and cycle data give farm finance more context. That makes financial reporting easier to explain and easier to act on.",
        },
        {
          title: "Projection, not promises",
          body: "Financial projections should be assumption-based. Shrimply helps frame projections as planning tools, not guarantees.",
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
