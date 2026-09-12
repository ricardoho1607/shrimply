import SeoLandingPage from "@/components/SeoLandingPage";
import { featureSeoPages, seoMetadata } from "@/config/seo";

const page = featureSeoPages.find(item => item.path === "/shrimp-water-quality-monitoring-software");

export const metadata = seoMetadata(page!);

export default function ShrimpWaterQualityMonitoringSoftwarePage() {
  return (
    <SeoLandingPage
      path="/shrimp-water-quality-monitoring-software"
      eyebrow="Water Quality & Environmental Monitoring"
      title="Shrimp Water Quality Monitoring Software for Vannamei Farms"
      intro="Shrimply delivers clean, connected water quality monitoring for commercial vannamei ponds. Track pre-dawn DO, afternoon pH swings, salinity, alkalinity, and toxic ammonia trends to prevent crashes, protect shrimp health, and reduce mortality."
      problem={{
        title: "Single readings hide dangerous pond trends",
        body: "Water chemistry shifts fast in intensive shrimp ponds. Isolated pen-and-paper measurements fail to reveal dangerous downward oxygen trends or rising toxic ammonia until shrimp are already dying at the surface. Treating single parameters without historical context leads to costly, ineffective chemical dosing and unnecessary crop loss.",
      }}
      solution={{
        title: "Environmental trend intelligence for faster action",
        body: "Shrimply turns isolated daily readings into actionable environmental trends. Compare pre-dawn and afternoon measurements, track parameter interactions (such as pH-dependent toxic NH₃ calculations), and connect water trends directly to feeding and growth records so technicians and managers can act proactively.",
      }}
      sections={[
        {
          title: "Pre-dawn & afternoon DO tracking",
          body: "Dedicated tracking for morning minimums and afternoon maximums to evaluate algal photosynthesis, bottom respiration stress, and aeration efficiency.",
        },
        {
          title: "pH swing & alkalinity stability",
          body: "Monitor diurnal pH variance and total carbonate alkalinity to maintain buffering capacity and minimize osmoregulatory and post-molt stress.",
        },
        {
          title: "Toxic ammonia (NH₃) & nitrite risk warning",
          body: "Track Total Ammonia Nitrogen (TAN) alongside matched pH, temperature, and salinity to evaluate toxic un-ionized ammonia and nitrite exposure.",
        },
        {
          title: "Salinity & mineral balance context",
          body: "Record salinity alongside calcium, magnesium, and potassium levels to maintain ionic ratios essential for growth in low-salinity and inland culture.",
        },
        {
          title: "Visual trend analysis & outlier detection",
          body: "Interactive trend charts highlight environmental parameter drift over 7, 14, and 30 days before critical danger thresholds are breached.",
        },
        {
          title: "Orson AI environmental diagnostics",
          body: "Orson AI cross-references water quality history with recent feeding and sampling records to explain appetite drops, growth variation, and stress patterns.",
        },
      ]}
      workflow={[
        {
          step: "STEP 01",
          title: "Log Field DO & pH Readings",
          body: "Technicians record morning pre-dawn and afternoon DO, temperature, pH, and salinity using mobile devices beside the pond.",
        },
        {
          step: "STEP 02",
          title: "Enter Chemistry & Lab Tests",
          body: "Input total alkalinity, TAN, nitrite, and mineral test-kit readings into the active pond cycle log.",
        },
        {
          step: "STEP 03",
          title: "Automatic Toxic Risk Calculation",
          body: "Shrimply evaluates parameter interaction risk (e.g. rising pH + rising TAN = high toxic NH₃ risk) with clear status flags.",
        },
        {
          step: "STEP 04",
          title: "Execute Timely Interventions",
          body: "Receive clear operational triggers for aeration adjustments, feed holds, or liming based on verified pond trend data.",
        },
      ]}
      audience={[
        "Commercial Shrimp Farm Operators managing intensive, semi-intensive, or biofloc ponds",
        "Pond Technicians taking routine water measurements twice daily at the pond edge",
        "Technical Farm Managers responsible for aeration strategy, water exchange, and treatments",
        "Aquaculture Biologists & Water Quality Consultants auditing farm biosafety",
      ]}
      metrics={[
        "Dissolved Oxygen (mg/L, pre-dawn & afternoon)",
        "Water Temperature (°C)",
        "pH (morning & afternoon delta)",
        "Total Alkalinity (mg/L as CaCO₃)",
        "Salinity (ppt)",
        "Total Ammonia Nitrogen (TAN, mg/L)",
        "Un-ionized Toxic Ammonia (NH₃-N, mg/L)",
        "Nitrite (NO₂⁻-N, mg/L)",
      ]}
      checklist={[
        "Measure pre-dawn dissolved oxygen at consistent depths (15–30 cm above pond bottom) where shrimp reside.",
        "Calibrate electronic DO and pH probes weekly against certified standard solutions.",
        "Record TAN alongside matched pH and temperature to assess actual un-ionized ammonia risk.",
        "Maintain pond alkalinity between 100–160 mg/L CaCO₃ to buffer against diurnal pH swings greater than 0.5.",
        "Cross-reference algal water colour shifts with transparency and pre-dawn oxygen trends.",
      ]}
      faqs={[
        {
          question: "Why does Shrimply separate pre-dawn and afternoon DO?",
          answer: "In phytoplankton-rich ponds, DO peaks in the afternoon due to algal photosynthesis and drops to its lowest point just before sunrise due to pond respiration. Tracking both is essential to predict oxygen depletion before it stresses shrimp.",
        },
        {
          question: "How does Shrimply evaluate ammonia risk?",
          answer: "Total Ammonia Nitrogen (TAN) toxicity depends directly on pH, water temperature, and salinity. Shrimply logs these parameters together so farm teams can evaluate the un-ionized toxic NH₃ fraction rather than relying on misleading raw TAN alone.",
        },
        {
          question: "Can water quality records be reviewed alongside sampling data?",
          answer: "Yes. When sampling records show slow growth or poor ADG, Shrimply surfaces water quality trends from that period so managers can identify whether oxygen stress, temperature swings, or nitrogen spikes caused the slowdown.",
        },
        {
          question: "Does Shrimply prescribe chemical dosages?",
          answer: "No. In accordance with aquaculture safety standards, Shrimply highlights risk trends and operational triggers (such as maximizing aeration or holding feed increases), while chemical amendments are calculated based on pond volume, product purity, and farm SOPs.",
        },
      ]}
      related={[
        { href: "/resources/vannamei-water-quality-parameters", label: "Vannamei water quality reference", description: "Target ranges, warning signs, and the pond context that changes risk." },
        { href: "/resources/water-quality-trends", label: "Water quality trends guide", description: "Reviewing DO, pH, salinity, ammonia, and trend directions over time." },
        { href: "/resources/shrimp-pond-water-colour-algae", label: "Shrimp pond water colour & algae", description: "Learn what green, brown, or clear water indicates about phytoplankton blooms." },
        { href: "/shrimp-feed-management-software", label: "Shrimp feed management software", description: "Connect water quality stability with feeding rates and appetite response." },
        { href: "/shrimp-growth-sampling-software", label: "Shrimp growth & sampling software", description: "Analyze how environmental parameters directly impact ADG and biomass." },
        { href: "/shrimp-farm-management-software", label: "Shrimp farm management software", description: "Explore the complete farm operations and reporting platform." },
        { href: "/features/disease-alerts", label: "Shrimp disease alerts software", description: "Early warning signals and biosecurity tracking across ponds." },
      ]}
    />
  );
}
