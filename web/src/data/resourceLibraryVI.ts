import type { ResourceArticle, GlossarySection } from "./resourceLibrary";
import {
  defaultResourceAuthorVI,
  defaultTechnicalReviewerVI,
  defaultNutritionReviewerVI,
  defaultOperationsReviewerVI,
} from "./vi_articles/metadata";

import { article as vannameiWaterQualityParameters } from "./vi_articles/vannamei-water-quality-parameters";
import { article as shrimpPondWaterColourAlgae } from "./vi_articles/shrimp-pond-water-colour-algae";
import { article as pondPerformance } from "./vi_articles/pond-performance";
import { article as vannameiStockingDensity } from "./vi_articles/vannamei-stocking-density";
import { article as shrimpCyclePlanning } from "./vi_articles/shrimp-cycle-planning";
import { article as shrimpFarmRecordKeeping } from "./vi_articles/shrimp-farm-record-keeping";
import { article as vannameiGrowthChart } from "./vi_articles/vannamei-growth-chart";
import { article as slowShrimpGrowthAdgTroubleshooting } from "./vi_articles/slow-shrimp-growth-adg-troubleshooting";
import { article as fcrShrimpFarming } from "./vi_articles/fcr-shrimp-farming";
import { article as shrimpFeedIndexCalculation } from "./vi_articles/shrimp-feed-index-calculation";
import { article as vannameiFeedingRate } from "./vi_articles/vannamei-feeding-rate";
import { article as feedInventoryControl } from "./vi_articles/feed-inventory-control";
import { article as feedTrayObservations } from "./vi_articles/feed-tray-observations";
import { article as waterQualityTrends } from "./vi_articles/water-quality-trends";
import { article as shrimpDiseaseAlerts } from "./vi_articles/shrimp-disease-alerts";
import { article as shrimpMortalityTracking } from "./vi_articles/shrimp-mortality-tracking";
import { article as whiteFecesDiseaseShrimp } from "./vi_articles/white-feces-disease-shrimp";
import { article as ehpShrimpDisease } from "./vi_articles/ehp-shrimp-disease";
import { article as whiteSpotSyndromeVirusShrimp } from "./vi_articles/white-spot-syndrome-virus-shrimp";
import { article as shrimpHarvestTracking } from "./vi_articles/shrimp-harvest-tracking";
import { article as shrimpFarmCogs } from "./vi_articles/shrimp-farm-cogs";
import { article as shrimpFarmCashFlow } from "./vi_articles/shrimp-farm-cash-flow";

export {
  defaultResourceAuthorVI,
  defaultTechnicalReviewerVI,
  defaultNutritionReviewerVI,
  defaultOperationsReviewerVI,
};

export const resourceArticlesVI: ResourceArticle[] = [
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

export const getResourceArticleVI = (slug: string): ResourceArticle | undefined =>
  resourceArticlesVI.find(article => article.slug === slug);

export const glossarySectionsVI: GlossarySection[] = [
  {
    title: "Chất lượng nước, Sức khỏe & Rủi ro",
    description: "Cẩm nang tra cứu chỉ số hóa lý nước, quản lý màu nước - tảo độc, nhận diện và phòng ngừa các bệnh nguy hiểm (phân trắng WFD, vi bào tử trùng EHP, đốm trắng WSSV).",
    terms: resourceArticlesVI.filter(article => article.section === "Chất lượng nước, Sức khỏe & Rủi ro"),
  },
  {
    title: "Quản lý trang trại & Vụ nuôi",
    description: "Tiêu chuẩn mật độ thả giống, lập kế hoạch lịch mùa vụ, thẻ điểm đánh giá hiệu suất ao và số hóa nhật ký ghi chép trang trại.",
    terms: resourceArticlesVI.filter(article => article.section === "Quản lý trang trại"),
  },
  {
    title: "Tăng trưởng & Thu mẫu",
    description: "Biểu đồ tăng trưởng tôm thẻ chân trắng, kỹ thuật chài mẫu xác định trọng lượng bình quân (MBW) và xử lý sự cố tôm chậm lớn, ADG sụt giảm.",
    terms: resourceArticlesVI.filter(article => article.section === "Tăng trưởng & Thu mẫu"),
  },
  {
    title: "Thức ăn & Kho bãi",
    description: "Bảng định mức cho ăn, tính chỉ số thức ăn ao tôm, tối ưu hóa hệ số FCR, kỹ thuật canh vó và kiểm soát hao hụt kho bãi.",
    terms: resourceArticlesVI.filter(article => article.section === "Thức ăn & Kho bãi"),
  },
  {
    title: "Thu hoạch & Tài chính",
    description: "Theo dõi sản lượng thu tỉa và thu dứt điểm, hạch toán giá thành sản xuất trên mỗi kg (COGS) và quản trị dòng tiền lưu động cho trang trại.",
    terms: resourceArticlesVI.filter(article => article.section === "Thu hoạch & Tài chính"),
  },
];
