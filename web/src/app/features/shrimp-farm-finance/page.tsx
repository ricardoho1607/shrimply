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
        { href: "/shrimp-farm-management-software", label: "Shrimp farm management software", description: "See how finance connects with pond records, inventory, reports, and production outcomes." },
        { href: "/features/feed-inventory", label: "Feed inventory and cost tracking", description: "Track feed stock and movement so inventory value can support farm cost review." },
        { href: "/features/shrimp-harvest-tracking", label: "Shrimp harvest tracking", description: "Connect harvested weight and sale context with revenue and cycle profitability." },
        { href: "/resources/shrimp-farm-cogs", label: "Shrimp farm COGS guide", description: "Read how production costs should be separated from cash timing and projections." },
        { href: "/resources/shrimp-farm-cash-flow", label: "Shrimp farm cash flow guide", description: "Understand why cash movement and profit reporting answer different farm questions." },
        { href: "/how-it-works", label: "How Shrimply works", description: "Follow the operating flow from farm logging to finance reports and owner review." },
      ]}
    />
  );
}
