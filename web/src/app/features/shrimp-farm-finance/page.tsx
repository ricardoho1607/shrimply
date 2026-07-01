import SeoLandingPage from "@/components/SeoLandingPage";
import { featureSeoPages, seoMetadata } from "@/config/seo";

const page = featureSeoPages.find(item => item.path === "/features/shrimp-farm-finance");

export const metadata = seoMetadata(page!);

export default function ShrimpFarmFinancePage() {
  return (
    <SeoLandingPage
      path="/features/shrimp-farm-finance"
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
        {
          title: "Explain what changed",
          body: "Finance reports become more useful when they connect cost movement to feed use, harvest timing, inventory value, and cycle performance.",
        },
        {
          title: "Support owner reviews",
          body: "Owners need reports that separate cash timing, production cost, profitability, and projection assumptions so follow-up decisions are clearer.",
        },
      ]}
      checklist={[
        "Separate cash flow, COGS, P&L, and projection questions.",
        "Tie feed, seed, inventory, labor, harvest, and other costs to cycle context.",
        "Show assumptions clearly when presenting financial projections.",
        "Review harvest revenue beside production cost and pond outcome.",
        "Use data quality notes when records are missing or incomplete.",
      ]}
      faqs={[
        {
          question: "Why separate cash flow, COGS, P&L, and projections?",
          answer: "Each report answers a different business question. Mixing them can hide whether the issue is timing, production cost, profitability, or a planning assumption.",
        },
        {
          question: "Are Shrimply financial projections guarantees?",
          answer: "No. Projections should be treated as assumption-based planning tools, not guaranteed harvest or profit outcomes.",
        },
        {
          question: "How does farm operation data improve finance reports?",
          answer: "Feed, inventory, harvest, and pond-cycle records give financial numbers operational context, making reports easier to explain and act on.",
        },
      ]}
      related={[
        { href: "/", label: "Homepage" },
        { href: "/shrimp-farm-management-software", label: "Farm Software" },
        { href: "/features/shrimp-harvest-tracking", label: "Harvest Tracking" },
        { href: "/resources/shrimp-farm-cogs", label: "COGS Guide" },
        { href: "/resources/shrimp-farm-cash-flow", label: "Cash Flow Guide" },
        { href: "/resources", label: "Education Hub" },
        { href: "/how-it-works", label: "How It Works" },
      ]}
    />
  );
}
