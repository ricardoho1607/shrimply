import SeoLandingPage from "@/components/SeoLandingPage";
import { featureSeoPages, seoMetadata } from "@/config/seo";

const page = featureSeoPages.find(item => item.path === "/shrimp-farm-management-software");

export const metadata = seoMetadata(page!);

export default function ShrimpFarmManagementSoftwarePage() {
  return (
    <SeoLandingPage
      eyebrow="Shrimp Farm Management Software"
      title="Shrimp farm management software for cleaner pond, feed, finance, and harvest decisions."
      intro="Shrimply gives shrimp farms a single place to manage operational records across ponds, feeding, sampling, water quality, inventory, harvests, assets, finance, disease alerts, and reporting."
      sections={[
        {
          title: "One operating system for farm data",
          body: "Replace scattered spreadsheets and disconnected apps with a shared workspace for owners, managers, and technicians. Shrimply keeps pond-cycle data, team activity, and farm reports connected.",
        },
        {
          title: "Built for shrimp operations",
          body: "Shrimply is designed around shrimp farm workflows: DOC, MBW, ADG, FCR, mortality, biomass, feeding, water quality, harvest planning, and cycle-level financial visibility.",
        },
        {
          title: "From daily logs to decisions",
          body: "The goal is not just record keeping. Shrimply helps farms understand what the data means, reduce missed signals, and prepare reports that explain performance clearly.",
        },
      ]}
      related={[
        { href: "/", label: "Homepage" },
        { href: "/vannamei-shrimp-farming-app", label: "Vannamei App" },
        { href: "/resources", label: "Education Hub" },
        { href: "/how-it-works", label: "How It Works" },
      ]}
    />
  );
}
