import SeoLandingPage from "@/components/SeoLandingPage";
import { featureSeoPages, seoMetadata } from "@/config/seo";

const page = featureSeoPages.find(item => item.path === "/shrimp-feed-management-software");

export const metadata = seoMetadata(page!);

export default function ShrimpFeedManagementSoftwarePage() {
  return (
    <SeoLandingPage
      path="/shrimp-feed-management-software"
      eyebrow="Feed & Nutrition Management"
      title="Shrimp Feed Management Software for Vannamei Farms"
      intro="Shrimply gives shrimp farmers complete visibility over daily feeding logs, feed tray clearance, feed warehouse stock, and cycle FCR. Stop feed waste, improve feed conversion, and link feeding actions directly to harvest profit."
      problem={{
        title: "Feed is 60% of farm costs—yet managed on guesswork",
        body: "Feed represents 50% to 70% of total production cost in commercial vannamei ponds. Most farms still rely on scattered paper pond logs, inaccurate feed tray interpretations, and untracked warehouse bags. Overfeeding pollutes pond bottoms, creates toxic ammonia spikes, and destroys profit margins; underfeeding stunts growth, reduces survival, and delays harvest timing.",
      }}
      solution={{
        title: "Connected feed control from warehouse to pond tray",
        body: "Shrimply centralizes daily feeding records, automatic inventory deductions, biomass-adjusted feeding rate calculations, and feed tray clearance scoring in one connected system. Field technicians log meals quickly at the pond edge, while managers and owners monitor cumulative FCR and warehouse balances in real time.",
      }}
      sections={[
        {
          title: "Feed inventory & lot control",
          body: "Track feed bags, pallet batches, manufacturing dates, and warehouse levels with automatic inventory deductions each time a pond feeding is logged.",
        },
        {
          title: "Standardized tray clearance scoring",
          body: "Record feed tray consumption across morning, midday, and evening checks using a 1–5 scoring system to catch appetite drops before water quality crashes.",
        },
        {
          title: "Real-time FCR & Feed Index calculations",
          body: "Calculate cumulative and period Feed Conversion Ratio (FCR) and daily feed index against verified biomass so you know your true feed efficiency.",
        },
        {
          title: "Biomass-adjusted feeding rate tables",
          body: "Adjust daily feed allocations dynamically as shrimp grow, factoring in water temperature, mean body weight (MBW), and days of culture (DOC).",
        },
        {
          title: "Appetite & water quality correlation",
          body: "View feed response alongside pre-dawn DO, water temperature, and pH trends to distinguish environmental sluggishness from disease onset.",
        },
        {
          title: "Pond-by-pond feed cost analytics",
          body: "Track feed cost per kg of shrimp produced and total feed expenditure per pond cycle to protect farm operating cash flow and profitability.",
        },
      ]}
      workflow={[
        {
          step: "STEP 01",
          title: "Set Daily Feeding Rations",
          body: "Calculate target daily feed from the latest sampling MBW, estimated pond biomass, water temperature, and feeding rate guidelines.",
        },
        {
          step: "STEP 02",
          title: "Log Feeding & Tray Checks",
          body: "Technicians record meal amounts and tray clearance 2–2.5 hours post-feeding directly into the Shrimply mobile app at the pond edge.",
        },
        {
          step: "STEP 03",
          title: "Auto-Deduct Warehouse Inventory",
          body: "Logged feed amounts automatically deduct stock from the designated feed brand, formula, and lot in Shrimply's inventory system.",
        },
        {
          step: "STEP 04",
          title: "Review FCR & Feed Alerts",
          body: "Managers review feed efficiency curves, spot ponds with rising FCR or uneaten feed, and calibrate next day rations with Orson AI assistance.",
        },
      ]}
      audience={[
        "Commercial Shrimp Farm Owners seeking lower cost per kg of harvested shrimp",
        "Farm Managers overseeing multi-pond feeding schedules and warehouse stock balances",
        "Pond Technicians logging daily feeding rounds and feed tray inspections on mobile",
        "Aquaculture Nutritionists & Consultants auditing feeding efficiency across crop cycles",
      ]}
      metrics={[
        "Feed Quantity (kg/day)",
        "Cumulative & Period FCR",
        "Feed Index (% biomass/day)",
        "Estimated Biomass (kg)",
        "Average Daily Gain (ADG)",
        "Tray Clearance Score (1–5)",
        "Feed Cost per kg Harvested",
        "Days of Culture (DOC)",
      ]}
      checklist={[
        "Calibrate daily feed allocations from verified sampling MBW and biomass rather than fixed calendar tables.",
        "Standardize feed tray check timing (typically 2 to 2.5 hours post-feeding) across all technician shifts.",
        "Record unconsumed feed and hold feed increases whenever dissolved oxygen drops below 4.0 mg/L.",
        "Track feed lot numbers and manufacturing dates to rotate stock using first-in, first-out (FIFO).",
        "Cross-reference feed appetite drops with water temperature swings and dissolved oxygen records.",
      ]}
      faqs={[
        {
          question: "How does Shrimply calculate Feed Conversion Ratio (FCR)?",
          answer: "Cumulative FCR is calculated as total feed fed (kg) divided by net shrimp biomass gain (current biomass + mortality/harvests - initial stocking biomass). Shrimply updates this automatically as feed logs and sampling records are entered.",
        },
        {
          question: "Does feeding activity automatically deduct inventory?",
          answer: "Yes. Unlike sampling records, feeding logs link to specific feed inventory items and atomic transactions deduct stock levels so warehouse balances stay synchronized.",
        },
        {
          question: "Can technicians log feeding offline?",
          answer: "Yes. Shrimply mobile works offline at the pond edge and syncs all feeding logs and tray observations as soon as an internet connection is available.",
        },
        {
          question: "How does Shrimply prevent overfeeding?",
          answer: "Shrimply combines feeding rate limits (% of biomass), tray consumption history, and water quality alerts (e.g. low DO or high ammonia) to flag unsafe feed increases before feed is thrown into the pond.",
        },
      ]}
      related={[
        { href: "/resources/fcr-shrimp-farming", label: "Shrimp FCR calculation guide", description: "How to calculate and reduce feed conversion ratio in commercial ponds." },
        { href: "/resources/vannamei-feeding-rate", label: "Vannamei feeding rate reference", description: "Daily feed percentages, tray adjustment rules, and biomass tables." },
        { href: "/resources/shrimp-feed-index-calculation", label: "Shrimp feed index calculation", description: "Learn how to use feed index to prevent underfeeding and overfeeding." },
        { href: "/resources/feed-inventory-control", label: "Feed inventory control guide", description: "Best practices for feed storage, bag tracking, and reorder planning." },
        { href: "/resources/feed-tray-observations", label: "Feed tray observation guide", description: "Standardize technician tray readings to catch appetite changes early." },
        { href: "/shrimp-farm-management-software", label: "Shrimp farm management software", description: "Explore Shrimply's all-in-one platform for vannamei farms." },
        { href: "/shrimp-growth-sampling-software", label: "Shrimp growth & sampling software", description: "Connect feed allocation directly to verified MBW and biomass growth." },
      ]}
    />
  );
}
