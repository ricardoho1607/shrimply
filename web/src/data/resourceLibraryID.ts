import type { ResourceArticle, GlossarySection } from "./resourceLibrary";
import {
  defaultResourceAuthorID,
  defaultTechnicalReviewerID,
  defaultNutritionReviewerID,
  defaultOperationsReviewerID,
} from "./id_articles/metadata";

import { article as vannameiWaterQualityParameters } from "./id_articles/vannamei-water-quality-parameters";
import { article as shrimpPondWaterColourAlgae } from "./id_articles/shrimp-pond-water-colour-algae";
import { article as pondPerformance } from "./id_articles/pond-performance";
import { article as vannameiStockingDensity } from "./id_articles/vannamei-stocking-density";
import { article as shrimpCyclePlanning } from "./id_articles/shrimp-cycle-planning";
import { article as shrimpFarmRecordKeeping } from "./id_articles/shrimp-farm-record-keeping";
import { article as vannameiGrowthChart } from "./id_articles/vannamei-growth-chart";
import { article as slowShrimpGrowthAdgTroubleshooting } from "./id_articles/slow-shrimp-growth-adg-troubleshooting";
import { article as fcrShrimpFarming } from "./id_articles/fcr-shrimp-farming";
import { article as shrimpFeedIndexCalculation } from "./id_articles/shrimp-feed-index-calculation";
import { article as vannameiFeedingRate } from "./id_articles/vannamei-feeding-rate";
import { article as feedInventoryControl } from "./id_articles/feed-inventory-control";
import { article as feedTrayObservations } from "./id_articles/feed-tray-observations";
import { article as waterQualityTrends } from "./id_articles/water-quality-trends";
import { article as shrimpDiseaseAlerts } from "./id_articles/shrimp-disease-alerts";
import { article as shrimpMortalityTracking } from "./id_articles/shrimp-mortality-tracking";
import { article as whiteFecesDiseaseShrimp } from "./id_articles/white-feces-disease-shrimp";
import { article as ehpShrimpDisease } from "./id_articles/ehp-shrimp-disease";
import { article as whiteSpotSyndromeVirusShrimp } from "./id_articles/white-spot-syndrome-virus-shrimp";
import { article as shrimpHarvestTracking } from "./id_articles/shrimp-harvest-tracking";
import { article as shrimpFarmCogs } from "./id_articles/shrimp-farm-cogs";
import { article as shrimpFarmCashFlow } from "./id_articles/shrimp-farm-cash-flow";

export {
  defaultResourceAuthorID,
  defaultTechnicalReviewerID,
  defaultNutritionReviewerID,
  defaultOperationsReviewerID,
};

export const resourceArticlesID: ResourceArticle[] = [
  vannameiWaterQualityParameters,
  shrimpPondWaterColourAlgae,
  pondPerformance,
  vannameiStockingDensity,
  shrimpCyclePlanning,
  shrimpFarmRecordKeeping,
  vannameiGrowthChart,
  slowShrimpGrowthAdgTroubleshooting,
  fcrShrimpFarming,
  shrimpFeedIndexCalculation,
  vannameiFeedingRate,
  feedInventoryControl,
  feedTrayObservations,
  waterQualityTrends,
  shrimpDiseaseAlerts,
  shrimpMortalityTracking,
  whiteFecesDiseaseShrimp,
  ehpShrimpDisease,
  whiteSpotSyndromeVirusShrimp,
  shrimpHarvestTracking,
  shrimpFarmCogs,
  shrimpFarmCashFlow,
];

export const getResourceArticleID = (slug: string): ResourceArticle | undefined =>
  resourceArticlesID.find(article => article.slug === slug);

export const glossarySectionsID: GlossarySection[] = [
  {
    title: "Kualitas Air, Kesehatan & Risiko",
    description: "Panduan parameter kimia air tambak, mitigasi alga, pencegahan penyakit, dan respons biosekuriti darurat.",
    terms: resourceArticlesID.filter(article => article.section === "Kualitas Air, Kesehatan & Risiko" || article.section === "Air, Kesehatan, dan Risiko"),
  },
  {
    title: "Manajemen Tambak & Siklus",
    description: "SOP padat tebar, perencanaan tebar hingga panen, scorecard performa kolam, dan pencatatan komprehensif.",
    terms: resourceArticlesID.filter(article => article.section === "Manajemen Tambak"),
  },
  {
    title: "Pertumbuhan & Sampling",
    description: "Grafik pertumbuhan vannamei, evaluasi bobot rata-rata (MBW/ABW), dan troubleshooting laju pertumbuhan harian (ADG).",
    terms: resourceArticlesID.filter(article => article.section === "Pertumbuhan & Sampling" || article.section === "Pertumbuhan dan Sampling"),
  },
  {
    title: "Pakan & Inventaris",
    description: "Tabel feeding rate, perhitungan indeks pakan, efisiensi FCR, observasi anco, dan kontrol stok gudang.",
    terms: resourceArticlesID.filter(article => article.section === "Pakan & Inventaris" || article.section === "Pakan dan Inventaris"),
  },
  {
    title: "Panen & Keuangan Tambak",
    description: "Pencatatan panen parsial/total, struktur harga pokok penjualan (HPP/COGS), dan perencanaan likuiditas arus kas.",
    terms: resourceArticlesID.filter(article => article.section === "Panen & Keuangan" || article.section === "Panen dan Keuangan"),
  },
];
