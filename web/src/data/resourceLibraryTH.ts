import type { ResourceArticle, GlossarySection } from "./resourceLibrary";
import {
  defaultResourceAuthorTH,
  defaultTechnicalReviewerTH,
  defaultNutritionReviewerTH,
  defaultOperationsReviewerTH,
} from "./th_articles/metadata";

import { article as vannameiWaterQualityParameters } from "./th_articles/vannamei-water-quality-parameters";
import { article as shrimpPondWaterColourAlgae } from "./th_articles/shrimp-pond-water-colour-algae";
import { article as pondPerformance } from "./th_articles/pond-performance";
import { article as vannameiStockingDensity } from "./th_articles/vannamei-stocking-density";
import { article as shrimpCyclePlanning } from "./th_articles/shrimp-cycle-planning";
import { article as shrimpFarmRecordKeeping } from "./th_articles/shrimp-farm-record-keeping";
import { article as vannameiGrowthChart } from "./th_articles/vannamei-growth-chart";
import { article as slowShrimpGrowthAdgTroubleshooting } from "./th_articles/slow-shrimp-growth-adg-troubleshooting";
import { article as fcrShrimpFarming } from "./th_articles/fcr-shrimp-farming";
import { article as shrimpFeedIndexCalculation } from "./th_articles/shrimp-feed-index-calculation";
import { article as vannameiFeedingRate } from "./th_articles/vannamei-feeding-rate";
import { article as feedInventoryControl } from "./th_articles/feed-inventory-control";
import { article as feedTrayObservations } from "./th_articles/feed-tray-observations";
import { article as waterQualityTrends } from "./th_articles/water-quality-trends";
import { article as shrimpDiseaseAlerts } from "./th_articles/shrimp-disease-alerts";
import { article as shrimpMortalityTracking } from "./th_articles/shrimp-mortality-tracking";
import { article as whiteFecesDiseaseShrimp } from "./th_articles/white-feces-disease-shrimp";
import { article as ehpShrimpDisease } from "./th_articles/ehp-shrimp-disease";
import { article as whiteSpotSyndromeVirusShrimp } from "./th_articles/white-spot-syndrome-virus-shrimp";
import { article as shrimpHarvestTracking } from "./th_articles/shrimp-harvest-tracking";
import { article as shrimpFarmCogs } from "./th_articles/shrimp-farm-cogs";
import { article as shrimpFarmCashFlow } from "./th_articles/shrimp-farm-cash-flow";

export {
  defaultResourceAuthorTH,
  defaultTechnicalReviewerTH,
  defaultNutritionReviewerTH,
  defaultOperationsReviewerTH,
};

export const resourceArticlesTH: ResourceArticle[] = [
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

export const getResourceArticleTH = (slug: string): ResourceArticle | undefined =>
  resourceArticlesTH.find(article => article.slug === slug);

export const glossarySectionsTH: GlossarySection[] = [
  {
    title: "คุณภาพน้ำ สุขภาพ และความเสี่ยง",
    description: "คู่มือค่าพารามิเตอร์เคมีน้ำ การจัดการสีน้ำและสาหร่าย การป้องกันโรคกุ้ง และมาตรการความปลอดภัยทางชีวภาพฉุกเฉิน",
    terms: resourceArticlesTH.filter(article => article.section === "น้ำ สุขภาพ และความเสี่ยง"),
  },
  {
    title: "การจัดการฟาร์มและรอบการเลี้ยง",
    description: "มาตรฐานความหนาแน่นในการปล่อยลูกกุ้ง การวางแผนรอบการเลี้ยง สกอร์การ์ดประเมินประสิทธิภาพบ่อ และการบันทึกข้อมูลฟาร์ม",
    terms: resourceArticlesTH.filter(article => article.section === "การจัดการฟาร์ม"),
  },
  {
    title: "การเติบโตและการสุ่มตัวอย่าง",
    description: "กราฟการเติบโตของกุ้งขาวแวนนาไม การประเมินน้ำหนักเฉลี่ย (MBW/ABW) และการแก้ไขปัญหากุ้งโตช้า/ADG ต่ำ",
    terms: resourceArticlesTH.filter(article => article.section === "การเติบโตและการสุ่มตัวอย่าง"),
  },
  {
    title: "อาหารและคลังสินค้า",
    description: "ตารางอัตราการให้อาหาร การคำนวณดัชนีอาหารกุ้ง ประสิทธิภาพ FCR การเช็กยอ และการควบคุมสต็อกคลังสินค้า",
    terms: resourceArticlesTH.filter(article => article.section === "อาหารและคลังสินค้า"),
  },
  {
    title: "การจับกุ้งและการเงินฟาร์ม",
    description: "การบันทึกผลผลิตการจับกุ้ง โครงสร้างต้นทุนการผลิตต่อกิโลกรัม (COGS) และการวางแผนสภาพคล่องกระแสเงินสด",
    terms: resourceArticlesTH.filter(article => article.section === "การจับกุ้งและการเงิน"),
  },
];
