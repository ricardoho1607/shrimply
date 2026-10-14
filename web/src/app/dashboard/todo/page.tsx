import { notFound } from "next/navigation";
import { ADAPTIVE_SOPS_ENABLED } from "@/lib/sopFeature";
import SopPageClient from "./SopPageClient";

export default function Page() {
  if (!ADAPTIVE_SOPS_ENABLED) notFound();
  return <SopPageClient />;
}
