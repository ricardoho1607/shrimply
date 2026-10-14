import { Redirect } from "expo-router";
import { ADAPTIVE_SOPS_ENABLED } from "./services/sopFeature";
import React from "react";
import { SopScreen } from "./components/SopScreen";
export default function Sops() {
  if (!ADAPTIVE_SOPS_ENABLED) return <Redirect href="/(tabs)" />;
  return <SopScreen mode="sops" />;
}
