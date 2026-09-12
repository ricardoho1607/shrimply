import SeoLandingPage from "@/components/SeoLandingPage";
import { featureSeoPages, seoMetadata } from "@/config/seo";

const page = featureSeoPages.find(item => item.path === "/shrimp-growth-sampling-software");

export const metadata = seoMetadata(page!);

export default function ShrimpGrowthSamplingSoftwarePage() {
  return (
    <SeoLandingPage
      path="/shrimp-growth-sampling-software"
      eyebrow="Sampling & Growth Analytics"
      title="Shrimp Growth & Sampling Software for Vannamei Farms"
      intro="Shrimply provides precision growth tracking and sampling management for vannamei shrimp farms. Calculate accurate Average Daily Gain (ADG), Mean Body Weight (MBW), population survival, and pond biomass to optimize harvest timing and feed budgets."
      problem={{
        title: "Biomass guesswork leads to feed waste or stunted growth",
        body: "Shrimp grow underwater out of direct sight. Sampling errors, fragmented notebook records, and naive single-point weight estimates create inaccurate biomass projections. Underestimating biomass leads to underfeeding and stunted growth; overestimating biomass wastes expensive feed, degrades pond bottoms, and destroys production margins.",
      }}
      solution={{
        title: "Intelligent biological calculations and growth curves",
        body: "Shrimply provides robust sampling workflows with intelligent look-back algorithms, automatic ADG calculation from stocking to sampling or between consecutive samplings, cumulative harvest deductions, and growth-curve benchmarking against DOC targets.",
      }}
      sections={[
        {
          title: "MBW look-back intelligence",
          body: "Robust look-back logic searches backwards for the latest valid non-zero MBW, preventing broken growth curves and faulty biomass calculations from incomplete sampling records.",
        },
        {
          title: "Automated Average Daily Gain (ADG)",
          body: "Automatically computes ADG using verified days elapsed between consecutive samplings or from stocking weight, giving real-time growth velocity alerts.",
        },
        {
          title: "Dynamic biomass & population calculation",
          body: "Calculates live biomass integrating initial stocking, cumulative recorded mortality, and partial harvests: Population = (Initial Stock - Mortality) - Harvested.",
        },
        {
          title: "DOC growth curve benchmarking",
          body: "Compare actual pond MBW trajectories against standard vannamei growth benchmarks across every day of culture (DOC) to spot deviations early.",
        },
        {
          title: "Size uniformity & grade distribution",
          body: "Record sample size spreads and weight variations to identify slow-growth sub-populations, moulting issues, or disease symptoms before they escalate.",
        },
        {
          title: "Harvest forecasting & buyer readiness",
          body: "Project future harvest weights and target DOC dates to negotiate premium buyer prices in advance and plan pond turnaround schedules.",
        },
      ]}
      workflow={[
        {
          step: "STEP 01",
          title: "Cast Net Field Sampling",
          body: "Technicians collect cast net samples across 3–4 pond quadrants, recording total counted shrimp and total net weighed grams.",
        },
        {
          step: "STEP 02",
          title: "Instant Metric Computation",
          body: "Enter count and weight into Shrimply on mobile; MBW, population count, and total pond biomass update instantaneously.",
        },
        {
          step: "STEP 03",
          title: "Analyze Growth Velocity (ADG)",
          body: "Shrimply calculates ADG against the previous valid sampling record and benchmarks progress against historical cycle performance.",
        },
        {
          step: "STEP 04",
          title: "Update Feed & Plan Harvest",
          body: "Daily feed allocations automatically calibrate to updated biomass; harvest projections update days-to-target market size.",
        },
      ]}
      audience={[
        "Commercial Vannamei Shrimp Farm Owners seeking predictable cycle yields and accurate biomass",
        "Farm Managers scheduling weekly cast-net sampling and feed ration adjustments",
        "Pond Technicians recording sample weights, counts, and size observations at the pond edge",
        "Aquaculture Agronomists & Hatchery Evaluators testing post-larvae strain growth vigor",
      ]}
      metrics={[
        "Mean Body Weight (MBW / ABW, grams)",
        "Average Daily Gain (ADG, g/day)",
        "Days of Culture (DOC)",
        "Pond Population Count",
        "Estimated Total Biomass (kg)",
        "Stocking Density (shrimp/m²)",
        "Estimated Survival Rate (%)",
        "Target Harvest Weight (g)",
      ]}
      checklist={[
        "Perform sampling during cool early morning hours to minimize shrimp stress and prevent muscle cramping.",
        "Sample from multiple pond locations (edges, corners, and feeding areas) to avoid size bias.",
        "Verify cast net mesh size and sample at least 100–150 shrimp per pond for statistical accuracy.",
        "Ensure sampling weight records never trigger inventory deductions—sampling is biological observation only.",
        "Cross-reference sudden ADG declines with recent water quality logs and feed tray clearance.",
      ]}
      faqs={[
        {
          question: "How does Shrimply handle missing or zero MBW entries?",
          answer: "Shrimply incorporates biological look-back algorithms. If the latest record has missing or zero MBW, the system searches backwards for the latest valid non-zero weight, preventing distorted growth curves and inaccurate feed allocations.",
        },
        {
          question: "How is Average Daily Gain (ADG) calculated?",
          answer: "If 2 or more sampling records exist: ADG = (latest MBW - previous MBW) / days between samplings. If only 1 sampling exists: ADG = (latest MBW - initial weight) / days elapsed since stocking.",
        },
        {
          question: "Does sampling reduce feed inventory in Shrimply?",
          answer: "Absolutely not. Under Shrimply biological engineering rules, sampling is strictly an observational record. Feed inventory is deducted only through explicit feeding activity logs.",
        },
        {
          question: "How does Shrimply account for partial harvests?",
          answer: "Shrimply tracks cumulative partial harvests and deducts both harvested head count and biomass from active pond population: Population = (Initial Stock - Total Mortality) - Total Harvested.",
        },
      ]}
      related={[
        { href: "/resources/vannamei-growth-chart", label: "Vannamei growth chart reference", description: "DOC vs target MBW benchmarks, growth curve phases, and targets." },
        { href: "/resources/slow-shrimp-growth-adg-troubleshooting", label: "Slow shrimp growth troubleshooting", description: "What to investigate first when ADG drops or growth stalls." },
        { href: "/resources/vannamei-stocking-density", label: "Vannamei stocking density guide", description: "Stocking limits, aeration requirements, and density impact on growth." },
        { href: "/shrimp-feed-management-software", label: "Shrimp feed management software", description: "Calibrate feed rations and monitor FCR using verified sampling biomass." },
        { href: "/shrimp-water-quality-monitoring-software", label: "Shrimp water quality monitoring software", description: "Analyze how DO, temperature, and nitrogen impact shrimp growth rates." },
        { href: "/shrimp-farm-management-software", label: "Shrimp farm management software", description: "Explore Shrimply's all-in-one shrimp farming management platform." },
        { href: "/resources/shrimp-harvest-tracking", label: "Shrimp harvest tracking guide", description: "Harvest planning, size grading, and buyer negotiation readiness." },
      ]}
    />
  );
}
