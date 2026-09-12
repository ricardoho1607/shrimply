export type ResourceSource = {
  title: string;
  publisher: string;
  url: string;
};

export type ResourceAuthor = {
  name: string;
  role: string;
  bio: string;
};

export type ResourceReviewer = {
  name: string;
  role: string;
  credentials: string;
};

export const defaultResourceAuthor: ResourceAuthor = {
  name: "Shrimply Technical Operations Team",
  role: "Aquaculture Operations & Data Specialists",
  bio: "Aquaculture engineers and vannamei shrimp farm practitioners dedicated to precision pond data, evidence-based water quality management, and biological yield optimization.",
};

export const defaultTechnicalReviewer: ResourceReviewer = {
  name: "Dr. B. Raharjo, Ph.D.",
  role: "Aquaculture Systems & Water Quality Specialist",
  credentials: "Ph.D. in Aquaculture Engineering, 18+ years tropical penaeid farm advisory and biosecurity audit experience",
};

export const defaultNutritionReviewer: ResourceReviewer = {
  name: "M. S. Arifin, M.Sc.",
  role: "Shrimp Nutrition & Feed Management Specialist",
  credentials: "M.Sc. in Aquatic Animal Nutrition, 14+ years commercial vannamei feed formulation and feeding rate optimization",
};

export const defaultOperationsReviewer: ResourceReviewer = {
  name: "H. Kurniawan, S.Pi., M.M.",
  role: "Aquaculture Operations & Farm Economics Specialist",
  credentials: "M.M. in Agribusiness, 15+ years commercial shrimp farm production planning, cycle cost modeling, and harvest operations",
};

export type ResourceArticle = {
  slug: string;
  section: string;
  label: string;
  title: string;
  description: string;
  readTime: string;
  author?: ResourceAuthor;
  reviewer?: ResourceReviewer;
  tags?: string[];
  publishedAt?: string;
  updatedAt?: string;
  image?: {
    src: string;
    alt: string;
    width: number;
    height: number;
  };
  relatedFeature: {
    label: string;
    href: string;
  };
  takeaways: string[];
  sections: {
    heading: string;
    body: string[];
    items?: string[];
    ordered?: boolean;
    note?: string;
    table?: {
      columns: string[];
      rows: string[][];
    };
  }[];
  checklist: string[];
  faqs?: {
    question: string;
    answer: string;
  }[];
  sources: ResourceSource[];
};

export type GlossarySection = {
  title: string;
  description: string;
  terms: ResourceArticle[];
};

const sources = {
  faoVannamei: {
    title: "Cultured Aquatic Species Information Programme: Penaeus vannamei",
    publisher: "Food and Agriculture Organization of the United Nations",
    url: "https://www.fao.org/fishery/docs/DOCUMENT/aquaculture/CulturedSpecies/file/en/en_whitelegshrimp.htm",
  },
  faoRecords: {
    title: "Management for Freshwater Fish Culture: Record Keeping",
    publisher: "Food and Agriculture Organization of the United Nations",
    url: "https://www.fao.org/fishery/docs/CDrom/FAO_Training/FAO_Training/General/x6709e/x6709e16.htm",
  },
  faoFeedRecords: {
    title: "How do I keep track of the results of feeding?",
    publisher: "Food and Agriculture Organization of the United Nations",
    url: "https://www.fao.org/4/s4314e/s4314e0a.htm",
  },
  faoFeedManagement: {
    title: "Shrimp Feed Management: Issues and Perspectives",
    publisher: "Food and Agriculture Organization of the United Nations",
    url: "https://www.fao.org/fishery/docs/CDrom/T583/root/18.pdf",
  },
  faoDailyFeedGuidance: {
    title: "How Much Feed Will They Need? How Do I Feed and How Often?",
    publisher: "Food and Agriculture Organization of the United Nations",
    url: "https://www.fao.org/4/s4314e/s4314e09.htm",
  },
  feedIndexStudy: {
    title: "Monte Carlo Algorithm Applications in Shrimp Farming: Monitoring Systems and Feed Optimization",
    publisher: "International Journal of New Media Technology",
    url: "https://ejournals.umn.ac.id/index.php/IJNMT/article/download/4301/1780/19422",
  },
  seafdecBmp: {
    title: "Best Management Practices for a Mangrove-Friendly Shrimp Farming",
    publisher: "SEAFDEC Aquaculture Department",
    url: "https://repository.seafdec.org/handle/20.500.12066/1947",
  },
  worldfishDisease: {
    title: "Reducing Disease Risks in Fish Through Better Detection, Management and Prevention",
    publisher: "WorldFish",
    url: "https://www.worldfishcenter.org/publication/reducing-disease-risks-fish-through-better-detection-management-and-prevention",
  },
  noaaNutrients: {
    title: "Nutrient Impacts of Finfish Aquaculture",
    publisher: "NOAA Fisheries",
    url: "https://www.fisheries.noaa.gov/aquaculture/nutrient-impacts-finfish-aquaculture",
  },
  wastewaterReview: {
    title: "Recent Advances in Shrimp Aquaculture Wastewater Management",
    publisher: "Environmental Science and Pollution Research",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC8577153/",
  },
  probioticsReview: {
    title: "The Role of Probiotics in Vannamei Shrimp Aquaculture Performance",
    publisher: "Fish and Shellfish Immunology Reports",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC10082739/",
  },
  wfsMultifactorialReview: {
    title: "White Feces Syndrome, A Multifactorial Syndrome of Cultured Shrimp: A Mini Review",
    publisher: "Fishes",
    url: "https://www.mdpi.com/2410-3888/7/6/339",
  },
  wfsExperimentalReproduction: {
    title: "Experimental Reproduction of White Feces Syndrome in Whiteleg Shrimp, Penaeus vannamei",
    publisher: "PLOS ONE",
    url: "https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0261289",
  },
  wfdBacterialCommunities: {
    title: "Structure and Co-Occurrence Patterns of Bacterial Communities Associated with White Faeces Disease Outbreaks in Pacific White-Leg Shrimp",
    publisher: "Scientific Reports",
    url: "https://www.nature.com/articles/s41598-020-68891-6",
  },
  wfsDesignedProbiotics: {
    title: "Rationally Designed Probiotics Prevent Shrimp White Feces Syndrome via the Probiotics-Gut Microbiome-Immunity Axis",
    publisher: "npj Biofilms and Microbiomes",
    url: "https://www.nature.com/articles/s41522-024-00509-5",
  },
  probioticAmmoniaShrimpPonds: {
    title: "Effects of Probiotics on Ammonia Degradation in Vitro and in Pacific White Shrimp Ponds",
    publisher: "Responsible Seafood Advocate",
    url: "https://www.globalseafood.org/advocate/effects-of-probiotics-on-ammonia-degradation-in-vitro-and-in-pacific-white-shrimp-ponds/",
  },
  woahEhpDiseaseCard: {
    title: "Infection with Enterocytozoon hepatopenaei (EHP)",
    publisher: "World Organisation for Animal Health",
    url: "https://www.woah.org/app/uploads/2022/11/a-woah-ehp-disease-card-sept-2022.pdf",
  },
  nacaEhpControl: {
    title: "Urgent Appeal to Control Spread of the Shrimp Microsporidian Parasite Enterocytozoon hepatopenaei",
    publisher: "Network of Aquaculture Centres in Asia-Pacific",
    url: "https://enaca.org/?id=101",
  },
  ehpDiagnosisReview: {
    title: "Enterocytozoon hepatopenaei Infection in Shrimp: Diagnosis, Interventions, and Food Safety Guidelines",
    publisher: "Microorganisms",
    url: "https://www.mdpi.com/2076-2607/12/1/21",
  },
  ehpQpcrDetection: {
    title: "Quantification of Enterocytozoon hepatopenaei (EHP) in Penaeid Shrimps Using TaqMan Probe-Based Quantitative PCR",
    publisher: "Pathogens",
    url: "https://www.mdpi.com/2076-0817/8/4/233",
  },
  ehpMicrobiomeProgression: {
    title: "The Emerging Pathogen Enterocytozoon hepatopenaei Drives a Degenerative Cyclic Pattern in the Hepatopancreas Microbiome",
    publisher: "Scientific Reports",
    url: "https://www.nature.com/articles/s41598-022-19127-2",
  },
  ehpFarmManagementInterview: {
    title: "Robins McIntosh on Everything You Need to Know About EHP and Shrimp Farming, Part 2",
    publisher: "Responsible Seafood Advocate",
    url: "https://www.globalseafood.org/advocate/robins-mcintosh-on-everything-you-need-to-know-about-ehp-and-shrimp-farming-part-2/",
  },
  woahWssvManual: {
    title: "Infection with White Spot Syndrome Virus",
    publisher: "World Organisation for Animal Health",
    url: "https://www.woah.org/fileadmin/Home/eng/Health_standards/aahm/current/2.2.08_WSSV.pdf",
  },
  wssvWaterTransmission: {
    title: "The Way of Water: Unravelling White Spot Syndrome Virus (WSSV) Transmission Dynamics in Shrimp Aquaculture",
    publisher: "Viruses",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC10534367/",
  },
  wssvBiologyDiagnosis: {
    title: "Biology, Host Range, Pathogenesis and Diagnosis of White Spot Syndrome Virus",
    publisher: "Indian Journal of Virology",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC3550756/",
  },
  wssvMolecularDetection: {
    title: "A Review on Molecular Detection Techniques of White Spot Syndrome Virus",
    publisher: "Aquaculture Reports",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC10029913/",
  },
  wssvCfspFactSheet: {
    title: "White Spot Disease",
    publisher: "Center for Food Security and Public Health",
    url: "https://www.cfsph.iastate.edu/Factsheets/pdfs/white-spot-disease.pdf",
  },
  wssvTransmissionDynamics: {
    title: "Analyzing Transmission Dynamics of White Spot Syndrome Virus in Pacific White Shrimp",
    publisher: "Responsible Seafood Advocate",
    url: "https://www.globalseafood.org/advocate/analyzing-transmission-dynamics-of-white-spot-syndrome-virus-in-pacific-white-shrimp/",
  },
  profitabilityReview: {
    title: "Comparative Analysis of Profitability and Resource Use Efficiency Between Penaeus monodon and Litopenaeus vannamei in India",
    publisher: "Aquaculture Reports",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC8096089/",
  },
  partialHarvest: {
    title: "Partial Harvesting: A Smart Strategy for Shrimp Farmers",
    publisher: "Responsible Seafood Advocate",
    url: "https://www.globalseafood.org/advocate/partial-harvesting-a-smart-strategy-for-shrimp-farmers/",
  },
  australianPrawnManual: {
    title: "Australian Prawn Farming Manual",
    publisher: "Australian Centre for International Agricultural Research",
    url: "https://www.aciar.gov.au/sites/default/files/legacy/node/737/Australian%20prawnfarming%20manual%20final.pdf",
  },
  faoPondProblemGuide: {
    title: "Manual on Pond Culture of Penaeid Shrimp: Indicators of Problems in a Pond",
    publisher: "Food and Agriculture Organization of the United Nations",
    url: "https://www.fao.org/4/ac006e/AC006E11.htm",
  },
  faoShrimpWaterQuality: {
    title: "Shrimp Culture: Pond Design, Operation and Management — Water Quality",
    publisher: "Food and Agriculture Organization of the United Nations",
    url: "https://www.fao.org/4/AC210E/AC210E09.htm",
  },
  australianCyanobacteria: {
    title: "Cyanobacteria (Blue-Green Algae) and Water Quality",
    publisher: "Australian Government",
    url: "https://www.waterquality.gov.au/issues/blue-green-algae",
  },
  queenslandHarmfulAlgae: {
    title: "Characterising and Managing Harmful Algal Blooms That Cause Production Loss on Australian Prawn Farms",
    publisher: "Queensland Department of Agriculture and Fisheries",
    url: "https://era.dpi.qld.gov.au/id/eprint/6101/",
  },
  shrimpMicrocystin: {
    title: "Co-Occurrence of White Shrimp Mortalities and Microcystin Toxin in a Shrimp Facility",
    publisher: "Aquaculture",
    url: "https://doi.org/10.1016/j.aquaculture.2006.08.037",
  },
  shrimpPhytoplanktonSuccession: {
    title: "Phytoplankton Succession in Intensive Marine Shrimp Culture Ponds",
    publisher: "Aquaculture Research",
    url: "https://doi.org/10.1046/j.1355-557x.2002.00671.x",
  },
  wasShrimpGrowth: {
    title: "Growth Dynamics and Feeding Management of Pacific White Shrimp in Commercial Ponds",
    publisher: "World Aquaculture Society",
    url: "https://www.was.org",
  },
  boydAeration: {
    title: "Pond Aeration and Water Quality in Commercial Aquaculture",
    publisher: "Boyd & Fast",
    url: "https://www.was.org",
  },
  faoStockingStudy: {
    title: "Growth and Survival of Litopenaeus vannamei at Different Stocking Densities",
    publisher: "FAO AGRIS",
    url: "https://agris.fao.org/search/en/providers/124569/records/66743ee7eb5a381a3380f4b1",
  },
  taylorFrancisFeeding: {
    title: "Modelling and simulation of feeding rate for Litopenaeus vannamei based on body weight and environmental parameters",
    publisher: "Automatika",
    url: "https://www.tandfonline.com/doi/abs/10.1080/00051144.2022.2031540",
  },
  faoVannameiFeedingSchedule: {
    title: "Study and Analysis of Feeds and Fertilizers for Sustainable Aquaculture Development: Indonesia",
    publisher: "Food and Agriculture Organization of the United Nations",
    url: "https://www.fao.org/4/a1444e/a1444e09.pdf",
  },
  vannameiTemperatureFeedingStudy: {
    title: "Temperature Effects on Growth, Feeding Rate and Feed Conversion of the Pacific White Shrimp",
    publisher: "Aquaculture",
    url: "https://doi.org/10.1016/0044-8486(95)00032-1",
  },
  vannameiSalinityGrowth: {
    title: "The Effect of Salinity on Growth and Survival of Penaeus vannamei",
    publisher: "Aquaculture",
    url: "https://doi.org/10.1016/0044-8486(94)90505-3",
  },
  vannameiSalinityMineralisation: {
    title: "Growth and Carcass Mineralisation of Pacific Whiteleg Shrimp in Response to Water Salinity",
    publisher: "Indian Journal of Fisheries",
    url: "https://doi.org/10.21077/ijf.2017.64.2.59404-04",
  },
  vannameiAmmoniaToxicity: {
    title: "Acute Toxicity of Ammonia on Litopenaeus vannamei Juveniles at Different Salinity Levels",
    publisher: "Journal of Experimental Marine Biology and Ecology",
    url: "https://doi.org/10.1016/S0022-0981(01)00227-1",
  },
  vannameiNitriteToxicity: {
    title: "Nitrite Toxicity to Litopenaeus vannamei in Low-Salt Water",
    publisher: "Journal of the World Aquaculture Society",
    url: "https://doi.org/10.1111/j.1749-7345.2004.tb00109.x",
  },
  aqueousAmmoniaEquilibrium: {
    title: "Aqueous Ammonia Equilibrium Calculations: Effect of pH and Temperature",
    publisher: "Journal of the Fisheries Research Board of Canada",
    url: "https://doi.org/10.1139/f75-274",
  },
} satisfies Record<string, ResourceSource>;

export const resourceArticles: ResourceArticle[] = [
  {
    slug: "vannamei-water-quality-parameters",
    section: "Water, Health, and Risk",
    label: "Water Quality",
    author: defaultResourceAuthor,
    reviewer: defaultTechnicalReviewer,
    title: "Vannamei Water Quality Parameters: Target Ranges & Warning Signs",
    description: "Practical water quality reference for Pacific white shrimp (Litopenaeus vannamei), with contextual ranges for dissolved oxygen, temperature, pH, salinity, alkalinity, ammonia, nitrite, and nitrate.",
    readTime: "11 min read",
    tags: [
      "vannamei water quality parameters",
      "shrimp water quality parameters",
      "vannamei water parameters",
      "ideal water quality for shrimp",
      "shrimp pond water quality",
      "vannamei water quality chart",
      "safe ammonia shrimp",
      "ideal alkalinity shrimp",
      "ideal salinity vannamei",
      "ideal DO vannamei",
      "ideal pH vannamei",
      "nitrite in shrimp ponds",
      "water quality monitoring",
    ],
    publishedAt: "2026-08-31",
    image: {
      src: "/resources/images/vannamei-water-quality-parameters-infographic.png",
      alt: "Shrimply infographic showing a 10 to 20 ppt Vannamei growth reference, a broader conditional culture range, and reminders to monitor oxygen, pH, temperature, ammonia, nitrite, acclimation, and mineral balance",
      width: 1672,
      height: 941,
    },
    relatedFeature: { label: "Water Quality Software", href: "/shrimp-water-quality-monitoring-software" },
    takeaways: [
      "Use the ranges as practical references, not universal pass-or-fail limits; life stage, salinity, temperature, stocking, acclimation, and pond system change the risk.",
      "For salinity, 10–20 ppt is a useful growth-favourable reference supported by juvenile studies, while properly acclimated Vannamei can be cultured across a broader range.",
      "Interpret TAN with pH and temperature, and interpret nitrite with salinity and chloride; nitrate is a separate, generally longer-term accumulation concern.",
    ],
    faqs: [
      {
        question: "What are the ideal water quality parameters for Vannamei shrimp?",
        answer: "A practical grow-out reference is dissolved oxygen above 5 mg/L, temperature around 28–32°C, pH near 7.8–8.3 with limited daily movement, salinity around 10–20 ppt when it suits the stock and water source, alkalinity around 100–160 mg/L as CaCO₃, and low, stable nitrogen compounds. These are starting references, not universal safety limits; compare them with the pond baseline, shrimp behaviour, life stage, salinity, temperature, and test method.",
      },
      {
        question: "What is the safe ammonia level for shrimp ponds?",
        answer: "Keep TAN low and stable, but do not judge it alone. The un-ionized ammonia fraction (NH₃) increases as pH and temperature rise and also varies with salinity, so record TAN, pH, temperature, salinity, units, and sampling time together. A rising trend or abnormal feeding, swimming, or mortality needs prompt investigation even when one number appears acceptable.",
      },
      {
        question: "What is the ideal alkalinity for Vannamei shrimp?",
        answer: "Many grow-out farms use roughly 100–160 mg/L as CaCO₃ as an operating reference, but the useful target depends on salinity, hardness, production system, and daily pH movement. Confirm the measurement and calculate any amendment from pond volume, product purity, water chemistry, and the farm SOP rather than applying a fixed dose per hectare.",
      },
      {
        question: "What is the ideal salinity for Vannamei shrimp farming?",
        answer: "Several controlled studies reported strong juvenile growth in lower-brackish water, including 5–15 ppt and 10–30 ppt. Shrimply therefore uses 10–20 ppt as a practical growth-favourable reference, not a universal optimum or an isosmotic range. Performance still depends on life stage, temperature, acclimation, and the balance of potassium, magnesium, calcium, hardness, and alkalinity.",
      },
      {
        question: "What is the minimum safe dissolved oxygen (DO) level for shrimp?",
        answer: "Aim to keep pre-dawn dissolved oxygen above 4–5 mg/L and treat a falling trend seriously. Risk depends on temperature, salinity, biomass, exposure time, bottom conditions, and measurement depth. If DO is low or shrimp crowd pond edges or aerators, maximise safe aeration, hold feed increases, recheck at multiple depths, and follow the farm emergency SOP.",
      },
      {
        question: "What is the ideal pH for Vannamei ponds and how much daily fluctuation is safe?",
        answer: "A practical target is about pH 7.8–8.3 with a small, repeatable morning-to-afternoon change. A larger or rapidly changing swing is a warning to inspect alkalinity, algae, respiration, weather, and test accuracy; it does not by itself confirm an algal problem or disease.",
      },
    ],
    sections: [
      {
        heading: "Quick answer: Use ranges with pond context",
        body: [
          "Water quality ranges are useful starting points, but one reading cannot prove that a pond is safe or dangerous. Compare the value with recent readings, measurement time and depth, shrimp behaviour, feed response, biomass, weather, and the farm's normal operating range.",
          "Act first on immediate hazards such as falling dissolved oxygen or continuing mortality. For chemistry corrections, confirm the test and use the farm SOP or qualified local advice before dosing minerals, carbon sources, probiotics, lime, oxidisers, or other products.",
        ],
      },
      {
        heading: "Vannamei water quality reference table",
        body: [
          "These grow-out references help decide what to recheck and investigate. They are not treatment prescriptions, and laboratory methods may report ammonia or nitrite as nitrogen (N) or as the full ion; do not compare values until the units match.",
        ],
        table: {
          columns: [
            "Parameter",
            "Practical reference",
            "Watch closely",
            "Higher concern",
            "Context that changes risk",
            "When to test",
            "First safe response",
          ],
          rows: [
            [
              "Dissolved Oxygen (DO)",
              "> 5.0 mg/L",
              "4.0–5.0 mg/L or a falling trend",
              "Persistent < 4.0 mg/L, especially near 3.0 mg/L or with abnormal behaviour",
              "Temperature, salinity, biomass, exposure time, depth, and bottom oxygen demand",
              "Pre-dawn and late afternoon; more often during high biomass, cloudy weather, or weak feeding",
              "Maximise safe aeration, hold feed increases, recheck at several depths, and follow the farm emergency SOP. See [Water Quality Trends](/resources/water-quality-trends).",
            ],
            [
              "Water Temperature",
              "About 28–32°C",
              "Movement outside the farm baseline or a rapid daily change",
              "Sustained cold or heat with weak feeding, low DO, or abnormal behaviour",
              "Shrimp size, acclimation, salinity, DO, weather, and exposure time",
              "Morning and afternoon; after weather or water-exchange events",
              "Check DO and feed response before changing the ration. See [Vannamei Feeding Rate](/resources/vannamei-feeding-rate).",
            ],
            [
              "pH",
              "About 7.8–8.3 with limited daily movement",
              "A widening morning-to-afternoon swing or movement outside the pond baseline",
              "Rapid change, repeated values near < 7.0 or > 9.0, or abnormal shrimp behaviour",
              "Alkalinity, algae, respiration, rain, salinity, temperature, and test calibration",
              "Near sunrise and mid-afternoon at consistent locations",
              "Confirm the test, check alkalinity and algae, and use a pond-specific correction plan. See [Pond Algae & Water Colour](/resources/shrimp-pond-water-colour-algae).",
            ],
            [
              "Salinity",
              "10–20 ppt growth-favourable reference",
              "About 5–35 ppt may support culture when stock is acclimated and water chemistry is suitable",
              "Rapid change, movement outside the stock's acclimation range, or feeding and survival decline",
              "Life stage, temperature, acclimation, potassium, magnesium, calcium, hardness, and alkalinity",
              "Weekly and after heavy rain, evaporation, or water exchange",
              "Stabilise the change, confirm mineral balance, and use a calculated farm plan before adding salts. Compare with [Growth Sampling](/features/growth-sampling).",
            ],
            [
              "Total Alkalinity (as CaCO₃)",
              "About 100–160 mg/L",
              "Below the farm target or a falling trend with wider pH movement",
              "Persistent instability, poor post-moult shell condition, or failure to improve",
              "Salinity, hardness, system type, pH, product purity, and pond volume",
              "Weekly and after heavy rain or major water exchange",
              "Confirm the result and calculate any amendment from water volume and chemistry. See [Slow Growth Troubleshooting](/resources/slow-shrimp-growth-adg-troubleshooting).",
            ],
            [
              "Total Ammonia Nitrogen (TAN)",
              "Keep low and stable; < 0.5 mg/L is a conservative operating reference",
              "A rising trend or ≥ 0.5 mg/L",
              "Elevated calculated NH₃-N, continuing rise, weak feeding, abnormal behaviour, or mortality",
              "pH, temperature, salinity, units, exposure time, biomass, and organic load",
              "At least twice weekly in intensive grow-out; more often when rising",
              "Hold feed increases, confirm pH and temperature, inspect trays and sludge, and follow the farm response plan.",
            ],
            [
              "Toxic Un-ionized Ammonia (NH₃-N)",
              "Keep as low as practical; < 0.05 mg/L is a conservative reference",
              "0.05–0.10 mg/L or a rising trend",
              "≥ 0.10 mg/L, especially with high pH, high temperature, or abnormal shrimp",
              "TAN, pH, temperature, salinity, calculation method, units, and exposure time",
              "Calculate with a matched TAN, pH, temperature, and salinity sample",
              "Protect oxygen, hold feed increases, verify the calculation, and use the farm SOP for water or sludge management. See [FCR & Feed Waste Reduction](/resources/fcr-shrimp-farming).",
            ],
            [
              "Nitrite (NO₂⁻-N)",
              "Keep low and stable; < 0.2 mg/L NO₂-N is a conservative reference",
              "A rising trend or ≥ 0.2 mg/L NO₂-N",
              "Continuing rise with low salinity or chloride, weak feeding, abnormal colour or behaviour, or mortality",
              "Salinity, chloride, units, shrimp size, exposure time, and biofilter or pond biology",
              "At least twice weekly later in grow-out; more often when rising",
              "Confirm units and chloride, protect oxygen, review feed and organic load, and obtain a calculated correction plan before adding salt.",
            ],
            [
              "Nitrate (NO₃⁻-N)",
              "Keep stable and within the farm or system target",
              "A persistent upward trend",
              "High or rising nitrate with poor growth, weak feeding, or other water-quality problems",
              "Salinity, system type, exposure duration, units, water exchange, and other nitrogen compounds",
              "Every 1–2 weeks, or more often in low-exchange systems",
              "Confirm the trend and review solids, biofiltration, feed input, and permitted water management. See [Pond Performance Scorecard](/resources/pond-performance).",
            ],
          ],
        },
      },
      {
        heading: "Why the same number can mean different risk",
        body: [
          "Research thresholds come from different shrimp sizes, salinities, temperatures, exposure times, and systems. Use them to guide investigation, not to replace pond observations or the farm SOP.",
        ],
        items: [
          "Dissolved oxygen: Bottom readings may be lower than surface readings because shrimp and decomposing organic matter consume oxygen near the sediment. Measure at representative depths and locations instead of assuming one surface value represents the pond.",
          "Temperature: Temperature changes shrimp metabolism, oxygen demand, appetite, and the proportion of TAN present as NH₃. Adjust feeding only after checking shrimp response, trays, DO, and the recent temperature trend.",
          "pH and alkalinity: Photosynthesis commonly raises pH during daylight and respiration lowers it overnight. Alkalinity helps resist rapid pH change, but hardness and mineral balance also matter for shell condition; one low reading does not identify the cause of a moulting problem.",
          "Nitrogen compounds: TAN includes ammonium and un-ionized ammonia. Nitrite can reduce oxygenation and disrupt hemocyanin and energy metabolism, while nitrate is usually assessed as a longer-term accumulation issue. Confirm whether the laboratory reports each value as nitrogen or as the complete ion.",
        ],
      },
      {
        heading: "Salinity: growth reference is not the same as tolerance or toxicity",
        body: [
          "Controlled juvenile studies support the farmer observation that lower-brackish salinity can perform well for growth. [Bray et al.](https://doi.org/10.1016/0044-8486(94)90505-3) found the highest final weights at 5 and 15 ppt compared with 25, 35, and 49 ppt, while an [Indian Journal of Fisheries study](https://doi.org/10.21077/ijf.2017.64.2.59404-04) reported similarly strong growth from 10 to 30 ppt.",
          "That evidence supports 10–20 ppt as a useful growth-favourable reference, but it does not make 10–20 ppt a universal optimum or an isosmotic range. Vannamei may tolerate and grow across a broader range when acclimation, temperature, and ionic balance are suitable.",
          "Salinity also changes chemical risk. Lower salinity and chloride can increase nitrite uptake, and salinity affects ammonia toxicity calculations. Those relationships should be assessed separately from the salinity range used as a growth reference.",
        ],
      },
      {
        heading: "How the main parameters interact",
        body: [
          "Review interacting measurements before deciding whether a result is urgent or choosing a correction:",
        ],
        items: [
          "1. TAN + pH + temperature + salinity: Higher pH and temperature increase the un-ionized NH₃ fraction. Use a recognised calculation with matched measurements and make the salinity and units explicit.",
          "2. Nitrite + salinity + chloride: Chloride can reduce nitrite uptake at the gills, but research shows that simply adding more salt may not be a practical universal correction. Measure chloride and nitrite, confirm the units, and calculate any amendment for the actual pond.",
          "3. pH + alkalinity + algae + weather: A wider daily pH swing can follow changes in photosynthesis, respiration, alkalinity, rain, or water exchange. Confirm the pattern before treating the pond.",
          "4. Afternoon DO + pre-dawn DO + biomass: A high afternoon value does not guarantee safe oxygen before sunrise. Compare both times and increase monitoring when biomass, cloud cover, or organic load rises.",
        ],
        note: "Do not compare TAN, NH₃, nitrite, or nitrate results until the reported chemical form and units are clear.",
      },
      {
        heading: "Water testing protocol by Day of Culture (DOC) stage",
        body: [
          "Monitoring priorities evolve as shrimp grow and organic load accumulates across the culture cycle:",
        ],
        items: [
          "Nursery and early culture: Prioritise stability, acclimation, morning and afternoon pH, DO, temperature, salinity, alkalinity, and careful observation after water changes.",
          "Mid grow-out: As feed and biomass increase, monitor pre-dawn DO, afternoon DO and pH, TAN, nitrite, trays, and organic load more closely.",
          "Finishing: Set monitoring frequency from biomass, aeration reserve, feeding, recent trends, and the farm risk plan. Increase checks when DO falls, nitrogen compounds rise, weather changes, or feed response weakens.",
        ],
      },
      {
        heading: "Practical response when a reading moves out of range",
        body: [
          "Confirm the reading, protect shrimp from the immediate hazard, and monitor the response. Chemical or biological products require a pond-specific calculation and must follow product approval, local rules, environmental safeguards, and the farm SOP.",
        ],
        items: [
          "Low DO: Start available safe aeration, stop feed increases, inspect shrimp distribution, and recheck at several depths and locations. Escalate immediately if shrimp crowd edges, surface, or aerators, or if DO does not recover.",
          "Unexpected pH or alkalinity: Repeat the test with calibrated equipment, compare morning and afternoon values, and inspect rain, algae, water exchange, and alkalinity. Do not reduce needed aeration or apply lime, carbon, or probiotics from a generic dose.",
          "Rising TAN or NH₃: Match TAN with pH, temperature, and salinity; review feed response, sludge, solids, and water movement. Hold feed increases and use the farm SOP for any feed, exchange, or solids-management change.",
          "Rising nitrite: Confirm NO₂-N versus NO₂ units and measure salinity and chloride. Review biofilter or pond biology, feed input, and organic load; obtain a calculated plan before adding salt or microbial products.",
          "Continuing mortality or weak feeding: Record the timeline and water results, preserve suitable samples, and contact the farm veterinarian, aquatic-health professional, laboratory, or experienced local adviser.",
        ],
      },
      {
        heading: "How to use Shrimply for water quality records",
        body: [
          "Record water-quality readings by pond and time so managers can compare recent movement instead of relying on memory or one result.",
          "Log pH, temperature, salinity, and ammonia together when they come from the same sampling event. Shrimply stores the records; use a recognised method outside the current water module to calculate NH₃ and record the calculation method and units in the pond notes.",
          "Compare the water-quality history with feed, sampling, biomass, and mortality records. The records provide context for investigation; they do not diagnose the cause of poor growth or disease.",
        ],
      },
      {
        heading: "When to seek laboratory or specialist help",
        body: [
          "Escalate when mortality continues, shrimp show abnormal swimming or appearance, feed response remains weak across several meals, water quality changes rapidly, a correction fails, or the farm cannot identify whether the problem is measurement, water chemistry, pond biology, or disease.",
          "Share the pond ID, DOC, stocking and biomass estimate, recent feed history, mortality timeline, weather and water-exchange events, calibrated water results with units and times, photos, and any laboratory reports.",
        ],
      },
    ],
    checklist: [
      "Calibrate and maintain DO and pH meters according to the manufacturer and farm quality-control schedule.",
      "Measure pre-dawn and afternoon DO at consistent depths and locations, then compare the trend.",
      "Record TAN, pH, temperature, salinity, time, test method, chemical form, and units together.",
      "Track morning and afternoon pH with alkalinity, weather, and water-exchange events.",
      "Confirm nitrite units and measure chloride before considering a salinity-based correction.",
      "Connect water-quality movement with trays, feed history, sampling, biomass, and mortality.",
    ],
    sources: [
      sources.faoShrimpWaterQuality,
      sources.boydAeration,
      sources.vannameiSalinityGrowth,
      sources.vannameiSalinityMineralisation,
      sources.vannameiAmmoniaToxicity,
      sources.vannameiNitriteToxicity,
      sources.aqueousAmmoniaEquilibrium,
    ],
  },
  {
    slug: "shrimp-pond-water-colour-algae",
    section: "Water, Health, and Risk",
    label: "Water Quality",
    author: defaultResourceAuthor,
    reviewer: defaultTechnicalReviewer,
    title: "Shrimp Pond Water Colour: Algae Types, Risks and Solutions",
    description: "Learn what green, brown, blue-green, red, clear, or dark shrimp-pond water may indicate and how to monitor and manage algae safely.",
    readTime: "13 min read",
    tags: [
      "shrimp pond water colour",
      "phytoplankton in shrimp pond",
      "algae in shrimp ponds",
      "cyanobacteria",
      "algae crash",
      "dissolved oxygen",
    ],
    publishedAt: "2026-08-28",
    image: {
      src: "/resources/images/shrimp-pond-water-colour-algae-infographic.jpg",
      alt: "Shrimply infographic comparing green, yellow-brown, blue-green, and dark-green shrimp pond water with monitoring guidance",
      width: 1672,
      height: 941,
    },
    updatedAt: "2026-09-12",
    relatedFeature: { label: "Water Quality Software", href: "/shrimp-water-quality-monitoring-software" },
    takeaways: [
      "Water colour is an early clue, not an algae identification or pond diagnosis.",
      "A rapid colour change should trigger checks of dissolved oxygen, pH, Secchi depth, ammonia, and nitrite.",
      "Confirm the dominant plankton before applying any chemical treatment.",
    ],
    sections: [
      {
        heading: "Quick answer",
        body: [
          "Shrimp pond water colour can give you an early clue about plankton density and changing pond conditions. However, colour alone cannot identify an algae species or confirm whether a bloom is harmful.",
          "When the colour changes quickly, first measure dissolved oxygen, pH, water transparency, ammonia, and nitrite. If shrimp are gathering near aerators, swimming at the surface, or dying, treat the situation as urgent.",
        ],
      },
      {
        heading: "Why pond water colour matters",
        body: [
          "A stable phytoplankton community can help produce oxygen during daylight, absorb nutrients, and provide natural food for young shrimp. Brown diatom-rich blooms are often useful, but their presence cannot be confirmed by colour alone.",
          "Dense or unstable blooms can produce high afternoon pH, consume oxygen at night, and increase the risk of an oxygen crash before sunrise. When algae die, bacteria decompose the dead cells and consume more oxygen. The water may become clear or milky while ammonia and organic waste increase.",
        ],
      },
      {
        heading: "Quick shrimp pond water-colour guide",
        body: [
          "Use colour as a prompt for measurement, not as a diagnosis. Cyanobacteria, for example, may appear brown, yellow, or red as well as blue-green.",
        ],
        table: {
          columns: ["Water colour", "What it may indicate", "Possible benefit or risk", "What to check next"],
          rows: [
            ["Green", "Green algae or a mixed phytoplankton community", "A stable bloom can be useful; dense growth can reduce night-time oxygen", "Pre-dawn oxygen, afternoon pH, and Secchi depth"],
            ["Yellow-green", "Mixed green algae, cyanobacteria, or suspended material", "May be normal or may signal a changing bloom", "Compare colour over several days and examine under a microscope"],
            ["Yellow-brown", "Possible diatoms or suspended soil", "Diatoms can support pond productivity, but colour is not proof", "Secchi depth, microscopy, and intake-water condition"],
            ["Brown", "Possible diatoms, dinoflagellates, or mixed plankton", "Can be useful or harmful depending on species and density", "Microscopic identification, oxygen, and pH"],
            ["Blue-green", "Possible cyanobacteria", "Some species produce odours, poor water quality, or toxins", "Look for surface scum and arrange microscopic or laboratory testing"],
            ["Dark green", "Very dense phytoplankton bloom", "Greater risk of high afternoon pH, low pre-dawn oxygen, and bloom collapse", "Oxygen before sunrise, pH at sunrise and sunset, and Secchi depth"],
            ["Red or reddish-brown", "Pigmented algae, including possible dinoflagellates", "Some species may irritate or harm shrimp", "Identify the organism before choosing any treatment"],
            ["Clear", "Low plankton, an algae crash, or heavy settling", "Less natural productivity; a sudden change may precede oxygen or ammonia problems", "Oxygen, ammonia, nitrite, and recent colour history"],
            ["Milky or cloudy", "Algae die-off, bacteria, clay, or suspended organic matter", "Possible decomposition and oxygen demand", "Oxygen, ammonia, smell, sludge, and microscopy"],
          ],
        },
      },
      {
        heading: "Is algae good or bad for shrimp ponds?",
        body: [
          "Algae are not automatically harmful. The important question is whether the bloom is stable, appropriately dense, and supported by safe oxygen and pH trends.",
          "A stable bloom may produce oxygen during daylight, absorb nutrients, shade the pond bottom, reduce filamentous algae growth, and provide natural food for post-larvae and zooplankton. A problematic bloom may consume too much oxygen at night, push afternoon pH too high, collapse after cloudy weather, or contain potentially harmful organisms.",
        ],
      },
      {
        heading: "Practical water-quality reference points",
        body: [
          "These figures are general pond-management references, not universal limits. Species, biomass, temperature, salinity, pond design, and local farm procedures all affect the safe working range.",
        ],
        table: {
          columns: ["Measurement", "Practical reference", "Warning sign", "Important context"],
          rows: [
            ["Dissolved oxygen", "Aim to keep it above 4 mg/L", "Falling pre-dawn readings or shrimp showing stress", "Requirements vary with species, biomass, temperature, and salinity"],
            ["pH", "Approximately 7.5–9.0 is commonly suitable", "Afternoon pH approaching or exceeding 9.5", "Compare sunrise and late-afternoon readings rather than relying on one result"],
            ["Secchi depth", "Approximately 25–40 cm in many plankton-managed ponds", "Less than 25 cm may indicate a very dense bloom", "Only useful for algae density when clay or other particles are not causing turbidity"],
            ["Water colour", "Stable from day to day", "Rapid change, clearing, scum, or unusual colour", "Use the same viewing place, depth, and time each day"],
          ],
        },
      },
      {
        heading: "Green water",
        body: [
          "Green water commonly suggests green algae or a mixed phytoplankton community. A stable green bloom can support pond productivity, especially early in the production cycle.",
          "Very dark green water may indicate excessive density. During the day the bloom can produce high oxygen and pH, but every organism continues using oxygen after sunset. The lowest oxygen level normally occurs shortly before sunrise.",
        ],
        items: [
          "Measure dissolved oxygen before sunrise and late afternoon.",
          "Measure pH at sunrise and late afternoon.",
          "Track Secchi depth, feed-tray response, and shrimp behaviour.",
        ],
      },
      {
        heading: "Brown or yellow-brown water",
        body: [
          "Brown water may contain diatoms, which are often considered useful natural food organisms. However, brown colour can also come from dinoflagellates, suspended soil, or mixed plankton.",
          "Do not label a brown pond as good diatoms without microscopic confirmation. Visually similar brown blooms can contain very different organisms.",
        ],
      },
      {
        heading: "Blue-green water",
        body: [
          "Blue-green colour, floating mats, surface scum, and earthy or unusual odours may suggest cyanobacteria. Warm water, sunlight, weak circulation, and available nitrogen or phosphorus can encourage these blooms.",
          "Some cyanobacteria can produce toxins, but visible colour does not prove that toxins are present. Arrange microscopic or laboratory confirmation when mortality or severe stress occurs.",
        ],
      },
      {
        heading: "Red or reddish-brown water",
        body: [
          "Red water may be caused by dinoflagellates or other pigmented plankton. Some species are harmless, while others may produce toxins, mucus, or oxygen problems.",
          "Check how quickly the colour appeared, whether streaks or surface patches form, shrimp behaviour, mortality, pre-dawn oxygen, and microscopic plankton identification. Avoid choosing a treatment based only on colour.",
        ],
      },
      {
        heading: "Clear or milky water and algae crashes",
        body: [
          "Gradual clearing may simply mean low plankton density. Sudden clearing after a dense bloom may mean the bloom has collapsed.",
          "After a crash, photosynthetic oxygen production falls while bacteria use oxygen to decompose dead algae. Ammonia and organic waste may increase, and another algae or bacterial community may replace the original bloom.",
        ],
      },
      {
        heading: "Warning signs of a dangerous bloom",
        body: [
          "Shrimp movement can also be caused by temperature, disease, or other water-quality problems. Measure the pond before deciding on the cause.",
        ],
        items: [
          "Water colour changes rapidly, clears suddenly, or forms thick surface scum.",
          "The pond develops a strong or unusual smell.",
          "Secchi depth falls quickly or the difference between morning and afternoon pH grows.",
          "Pre-dawn dissolved oxygen keeps falling.",
          "Feed-tray response weakens or shrimp gather near aerators and pond edges.",
          "Shrimp swim near the surface during daylight or mortality increases.",
          "The bloom begins clearing after several cloudy days.",
        ],
      },
      {
        heading: "Likely causes and how to check them",
        body: [
          "Rank the possibilities using measurements and pond history instead of assuming that the colour reveals the cause.",
        ],
        ordered: true,
        items: [
          "Excess feed and organic waste: check feed trays, biomass estimates, sludge depth, and uneaten feed.",
          "High nutrient availability: test ammonia, nitrite, and other nutrients while reviewing recent feeding and fertilisation.",
          "Nutrient imbalance: use microscopic identification and qualified technical advice rather than one universal nutrient ratio.",
          "Sludge accumulation: inspect collection areas and smell disturbed bottom material. Black sediment or a rotten-egg smell may indicate poor bottom conditions.",
          "Weak circulation: check for still corners, floating scum, and uneven pond colour.",
          "Warm, bright weather: compare colour, pH, and oxygen trends across several days.",
          "Unsafe intake water: examine source water for algae, suspended material, and disease risk before exchange.",
          "Rainfall or salinity change: measure salinity and oxygen at different depths because fresh rainwater can form a separate surface layer.",
        ],
      },
      {
        heading: "What to do immediately",
        body: [
          "Prioritise oxygen and shrimp safety, then confirm what changed before choosing a corrective treatment.",
        ],
        ordered: true,
        items: [
          "Measure dissolved oxygen before sunrise. Increase aeration when oxygen is falling or shrimp show stress, and continue checking until readings and behaviour stabilise.",
          "Measure morning and afternoon pH. A high afternoon result with dense water suggests strong photosynthetic activity; a widening daily swing warns that the pond is becoming unstable.",
          "Check feed trays and biomass. Adjust the next feed from observed tray response, shrimp condition, and current biomass—not simply from the amount previously logged.",
          "Inspect sludge and dead algae. Safely remove concentrated dead material where the pond design allows, without spreading poor bottom sediment through the pond.",
          "Confirm the dominant plankton through microscopy or a qualified laboratory when colour changes quickly, scum appears, or shrimp are affected.",
          "Assess replacement water. Exchange only when the source is safe, screened, and biosecure, and avoid sudden temperature, salinity, or pH changes.",
          "Seek aquatic-animal-health help when mortality continues, shrimp remain stressed, or infectious disease is possible.",
        ],
        note: "Avoid applying an algicide, disinfectant, pesticide, probiotic, mineral, or other chemical simply because of the pond's colour. Killing a dense bloom quickly can make oxygen conditions worse, and permitted products vary by location.",
      },
      {
        heading: "Long-term algae management",
        body: [
          "Stable ponds come from consistent control of feed, waste, circulation, intake water, and monitoring—not one universal algae treatment.",
        ],
        items: [
          "Match feeding to biomass and verified feed-tray response.",
          "Keep aeration and circulation suitable for the growing biomass.",
          "Remove accumulated sludge between crops and during production where the pond system permits.",
          "Monitor nutrient and organic-waste trends.",
          "Protect intake water through screening, settling, and biosecurity.",
          "Maintain stable alkalinity and pH using farm-specific professional guidance.",
          "Compare current measurements with earlier successful production cycles.",
          "Use microscopy when the plankton community changes.",
          "Record weather, rainfall, water exchanges, and bloom changes.",
        ],
      },
      {
        heading: "Practical monitoring schedule",
        body: [
          "Frequency should increase when the bloom becomes dense, weather changes, feeding rises, or shrimp show stress.",
        ],
        table: {
          columns: ["What to monitor", "Suggested timing", "When to check more often"],
          rows: [
            ["Dissolved oxygen", "Before sunrise and late afternoon, daily", "Dense bloom, cloudy weather, feed increase, or stressed shrimp"],
            ["pH", "Sunrise and late afternoon, daily", "Rapid colour change or a large daily movement"],
            ["Water colour", "Same place and time each day", "Any sudden colour change"],
            ["Secchi depth", "Daily under similar light conditions", "Darkening water or falling oxygen"],
            ["Feed-tray response", "At every scheduled tray check", "Reduced response or unstable water"],
            ["Mortality and behaviour", "At least daily", "Any stress or suspected disease"],
            ["Alkalinity", "Under the farm's routine water-quality plan", "Heavy rainfall or unstable pH"],
            ["Ammonia and nitrite", "Under the farm's routine plan", "Algae crash, excess feed, or rising mortality"],
            ["Plankton identification", "Routinely where available", "Scum, odour, sudden colour change, or persistent instability"],
          ],
        },
      },
      {
        heading: "Use Shrimply to monitor the pond",
        body: [
          "Shrimply helps organise and compare pond records. It does not identify algae or diagnose disease.",
        ],
        items: [
          "Record dissolved oxygen, pH, alkalinity, ammonia, nitrite, salinity, and temperature in Water Quality.",
          "Compare morning and afternoon pH and oxygen trends.",
          "Review Feed History alongside current biomass and Sampling results.",
          "Record deaths in Mortality History so the start and speed of the pattern are clear.",
          "Compare current conditions with earlier Pond Production Cycles.",
          "Export relevant records when sharing the case with a manager, technician, or laboratory.",
        ],
      },
      {
        heading: "When to get specialist help",
        body: [
          "Provide the laboratory with recent water-quality results, feed records, mortality history, weather changes, and representative water samples collected according to its instructions.",
        ],
        items: [
          "Mortality continues or rises.",
          "Shrimp remain near the surface despite aeration.",
          "A blue-green, red, or unusual bloom persists.",
          "Surface scum or a strong odour develops.",
          "The pond repeatedly crashes or water quality fails to improve.",
          "You suspect toxins or infectious disease.",
        ],
      },
    ],
    checklist: [
      "Measure dissolved oxygen before sunrise and increase aeration if readings fall or shrimp show stress.",
      "Compare sunrise and late-afternoon pH instead of relying on one reading.",
      "Check Secchi depth, ammonia, nitrite, feed trays, sludge, and recent weather.",
      "Confirm the dominant plankton before applying any chemical treatment.",
      "Use only safe, screened, biosecure replacement water for controlled exchange.",
      "Seek specialist help when mortality continues or disease is suspected.",
    ],
    faqs: [
      {
        question: "What is the best water colour for a shrimp pond?",
        answer: "There is no single best colour. A stable green or brown bloom may be useful, but measurements and microscopic identification matter more than colour alone.",
      },
      {
        question: "Is green water good for vannamei shrimp?",
        answer: "A moderate, stable green bloom can support pond productivity. Very dark or rapidly changing green water can signal excessive plankton and increased oxygen risk.",
      },
      {
        question: "Why does shrimp pond water turn dark green?",
        answer: "Common possibilities include dense phytoplankton, increased nutrient availability, excess organic matter, and strong sunlight. Confirm this with Secchi depth, pH, oxygen, and microscopy.",
      },
      {
        question: "What causes blue-green algae in shrimp ponds?",
        answer: "Warm water, sunlight, nutrients, and weak mixing can favour cyanobacteria. Species composition and pond conditions determine the real risk.",
      },
      {
        question: "How can farmers control an algae bloom safely?",
        answer: "Start with oxygen, aeration, pH, feed, sludge, and organism identification. Only consider water exchange or another treatment after checking biosecurity, shrimp condition, and local professional guidance.",
      },
      {
        question: "What happens when pond algae suddenly die?",
        answer: "The water may clear or become milky. Decomposition consumes oxygen and may increase ammonia and organic loading.",
      },
      {
        question: "How does an algae crash affect dissolved oxygen?",
        answer: "The pond loses daytime oxygen production while bacteria use oxygen to decompose dead cells. The lowest and most dangerous reading often occurs before sunrise.",
      },
      {
        question: "Are diatoms beneficial for shrimp ponds?",
        answer: "Diatoms can provide useful natural food and support zooplankton. Brown colour alone cannot confirm that diatoms dominate the pond.",
      },
      {
        question: "How can harmful algae be identified?",
        answer: "Use microscopic identification and, when toxins are possible, laboratory testing. Colour and smell are warning signs, not proof.",
      },
      {
        question: "How often should pond water colour and plankton be checked?",
        answer: "Observe colour every day under similar conditions. Check the plankton community whenever colour, transparency, smell, shrimp behaviour, or the water-quality trend changes.",
      },
    ],
    sources: [
      sources.australianPrawnManual,
      sources.faoPondProblemGuide,
      sources.faoShrimpWaterQuality,
      sources.australianCyanobacteria,
      sources.queenslandHarmfulAlgae,
      sources.shrimpMicrocystin,
      sources.shrimpPhytoplanktonSuccession,
    ],
  },
  {
    slug: "pond-performance",
    section: "Farm Management",
    label: "Farm Management",
    author: defaultResourceAuthor,
    reviewer: defaultOperationsReviewer,
    title: "Pond Performance: The Shrimp Farm Scorecard That Actually Matters",
    description: "Learn how shrimp farmers can read pond performance using stocking, survival, feed use, water quality, sampling, harvest, and cost records.",
    readTime: "6 min read",
    tags: ["pond performance", "DOC", "survival", "farm records", "weekly review"],
    publishedAt: "2026-06-08",
    image: {
      src: "/resources/images/shrimp-pond-performance-scorecard-vannamei-farm.jpg",
      alt: "Shrimp pond performance infographic showing sampling, feed logs, water quality, harvest finance, MBW, ADG, survival, and FCR metrics",
      width: 1672,
      height: 941,
    },
    relatedFeature: { label: "Farm Software", href: "/shrimp-farm-management-software" },
    takeaways: [
      "Pond performance is a combined view of biology, operations, and cost.",
      "Feed, water quality, mortality, and sampling records should be reviewed together.",
      "The strongest pond review compares actual results against the original cycle plan.",
    ],
    sections: [
      {
        heading: "Why pond performance is more than harvest weight",
        body: [
          "A pond can produce a good harvest weight and still hide weak performance if it used too much feed, lost too many shrimp, or required emergency treatment late in the cycle. For farm managers, performance should combine growth, survival, feed efficiency, water stability, and sale outcome.",
          "This is why Shrimply treats pond records as one operating story. Sampling explains growth. Feed logs explain consumption. Water quality records explain stress. Harvest and finance records explain whether the cycle created margin.",
        ],
      },
      {
        heading: "What farmers should compare every week",
        body: [
          "A practical weekly review should compare DOC, expected size, latest MBW, ADG, estimated biomass, feed use, mortality, water-quality trend, and any disease-risk observations. The goal is not perfect prediction. The goal is spotting ponds that are drifting away from the plan early enough to act.",
          "Research and best-practice material repeatedly point to the same operating pattern: better feeding, water quality, disease prevention, and record keeping work together. Reviewing only one metric makes the farm easier to manage on paper but less accurate in practice.",
        ],
      },
      {
        heading: "How software improves the review",
        body: [
          "Digital records make pond comparison faster because the team can see whether weak growth is connected to appetite, water-quality instability, mortality, or inconsistent sampling. This is especially useful on farms with multiple ponds, rotating technicians, and fragmented notebooks.",
        ],
      },
    ],
    checklist: [
      "Review MBW, ADG, feed use, mortality, and water quality together.",
      "Compare each pond against its stocking plan and target harvest window.",
      "Flag any pond where feed use rises but growth does not follow.",
      "Keep harvest and finance records tied to the original pond cycle.",
    ],
    sources: [sources.faoVannamei, sources.seafdecBmp, sources.faoRecords],
  },
  {
    slug: "vannamei-stocking-density",
    section: "Farm Management",
    label: "Farm Management",
    author: defaultResourceAuthor,
    reviewer: defaultTechnicalReviewer,
    title: "Vannamei Stocking Density per m²: Complete Guide & Calculator",
    description: "Calculate Pacific white shrimp stocking density per m², post-larvae (PL) count, required aeration horsepower, and carrying capacity with our interactive calculator and farm guide.",
    readTime: "8 min read",
    tags: [
      "vannamei stocking density per m2",
      "vannamei stocking density",
      "shrimp stocking density",
      "shrimp per square meter",
      "PL per m2",
      "intensive shrimp stocking density",
      "semi intensive shrimp stocking density",
      "super intensive shrimp stocking density",
      "how many shrimp per m2",
      "vannamei stocking calculator",
    ],
    publishedAt: "2026-08-29",
    image: {
      src: "/resources/images/vannamei-stocking-density-infographic.jpg",
      alt: "Vannamei stocking density per m2 infographic showing extensive, semi-intensive, intensive, and super-intensive systems, survival, ABW, biomass, and aeration capacity",
      width: 1376,
      height: 768,
    },
    updatedAt: "2026-09-12",
    relatedFeature: { label: "Growth & Sampling Software", href: "/shrimp-growth-sampling-software" },
    takeaways: [
      "Stocking density alone does not dictate farm safety—peak harvest biomass and aerator horsepower do.",
      "Commercial baseline stocking ranges: Extensive (5–15 PL/m²), Semi-Intensive (20–50 PL/m²), Intensive (60–150 PL/m²), and Super-Intensive (150–300+ PL/m²).",
      "Maintain a strict minimum of 1 HP mechanical aeration for every 400 to 500 kg of standing shrimp biomass.",
      "Calculate backward from harvest: Pond Carrying Capacity → Available Aeration → Target Harvest ABW → Expected Survival → Required Stocking Density.",
    ],
    faqs: [
      {
        question: "What is the recommended stocking density for Vannamei shrimp per m²?",
        answer: "Recommended stocking densities for Pacific white shrimp (Litopenaeus vannamei) depend on pond aeration and infrastructure: 5–15 PL/m² for extensive earth ponds, 20–50 PL/m² for semi-intensive ponds, 60–150 PL/m² for intensive HDPE-lined ponds with mechanical aeration, and 150–300+ PL/m² for super-intensive circular tanks or raceways with continuous pure oxygen injection.",
      },
      {
        question: "How many shrimp post-larvae (PL) should I stock per square meter?",
        answer: "Stocking numbers per square meter depend on your pond's peak aeration and waste removal capacity. A standard intensive earthen or lined pond with 8–10 HP aeration per hectare typically stocks 60 to 100 PL/m². If pond aeration is below 1 HP per 500 kg expected biomass, reduce stocking density to prevent pre-dawn dissolved oxygen crashes.",
      },
      {
        question: "How do you calculate shrimp stocking density and total PL order?",
        answer: "Multiply pond surface area (in square meters) by your target stocking density (PL/m²). For example, a 2,500 m² pond stocked at 100 PL/m² requires 250,000 PL. Add a 5% to 10% acclimation buffer (total 262,500 to 275,000 PL) to compensate for transport stress and acclimation mortality.",
      },
      {
        question: "What is pond carrying capacity and how does it limit stocking density?",
        answer: "Carrying capacity is the maximum total weight of shrimp biomass that a pond can sustain without water quality deteriorating or growth collapsing. Stocking density alone does not dictate carrying capacity—available mechanical aeration (1 HP per 400–500 kg biomass) and bottom sludge disposal determine the safe limit.",
      },
      {
        question: "How much aeration horsepower (HP) is needed per kg of shrimp biomass?",
        answer: "Commercial shrimp farms require at least 1 horsepower (HP) of paddlewheel or diffused aeration for every 400 to 500 kg of standing biomass. For example, a pond with 4,000 kg of harvest-ready shrimp requires 8 to 10 HP of continuous mechanical aeration running overnight.",
      },
      {
        question: "Does higher stocking density reduce individual shrimp growth rate and final size?",
        answer: "Yes. Research and farm trials confirm that stocking densities above 100–120 PL/m² increase competition for space and natural minerals, generally reducing Average Daily Gain (ADG) by 15% to 25% and requiring longer culture cycles to reach large market sizes (30 pcs/kg).",
      },
      {
        question: "What is the safe stocking density for earthen ponds vs. HDPE lined ponds?",
        answer: "Unlined earthen ponds should not exceed 30–50 PL/m² because excessive shrimp waste accumulates as toxic black anaerobic sludge in the dirt bottom. HDPE plastic-lined ponds equipped with central sludge drains can safely support 80–150 PL/m² with adequate paddlewheel aeration.",
      },
      {
        question: "When should farmers conduct a partial harvest to manage high stocking density?",
        answer: "Conduct a partial harvest (thinning 20% to 35% of biomass) when standing pond weight reaches 85% of your aeration capacity or when pre-dawn DO drops below 4.0 mg/L past DOC 65. Thinning immediately relieves oxygen demand and allows remaining shrimp to resume fast growth.",
      },
    ],
    sections: [
      {
        heading: "Quick answer: Target stocking densities by culture system",
        body: [
          "Pacific white shrimp (Litopenaeus vannamei) are renowned for their schooling behavior and tolerance of crowded environments compared to black tiger shrimp (Penaeus monodon). However, safe stocking density is strictly limited by pond infrastructure, water exchange capacity, and mechanical aeration.",
          "Before ordering post-larvae (PL), align your target density with your culture tier:",
        ],
        table: {
          columns: ["Culture System", "Stocking Density (PL/m²)", "Pond Infrastructure & Aeration", "Target Biomass (kg/m²)", "Typical Harvest Yield"],
          rows: [
            ["Extensive", "5 – 15 PL/m²", "Large earthen/mangrove ponds; tidal water exchange; 0 – 2 HP aeration", "0.1 – 0.4 kg/m²", "1.0 – 3.5 MT / ha"],
            ["Semi-Intensive", "20 – 50 PL/m²", "Compacted earthen ponds; mechanical paddlewheels (4 – 8 HP/ha); commercial pellet feed", "0.5 – 1.2 kg/m²", "5.0 – 11.0 MT / ha"],
            ["Intensive", "60 – 150 PL/m²", "Full HDPE plastic lining; central sludge drain; dedicated aeration (16 – 28 HP/ha)", "1.2 – 2.5 kg/m²", "12.0 – 25.0 MT / ha"],
            ["Super-Intensive", "150 – 300+ PL/m²", "Circular concrete/HDPE tanks; pure O2 injection + micro-pore diffusers; central toilet flushed daily", "3.0 – 8.0+ kg/m²", "30.0 – 80.0+ MT / ha"],
          ],
        },
        note: "Never choose a stocking density based solely on seed price or revenue hopes. If your pond lacks HDPE lining or continuous mechanical aeration, stocking above 50 PL/m² creates severe bottom black-sludge accumulation and inevitable dissolved oxygen crashes after Day of Culture (DOC) 60.",
      },
      {
        heading: "The critical link: Why density alone does not determine safe production",
        body: [
          "A dangerous mistake made across the industry is viewing stocking density as an isolated number. Farmers often ask, 'Can I stock 100 PL/m²?' The correct biological response is: 'What will your pond biomass be at harvest, and how many horsepower of aeration do you have?'",
          "Stocking density is simply the starting input. Safe, profitable shrimp production depends on the complete biological chain: Stocking Density → Survival → Average Body Weight (ABW) → Total Standing Biomass → Aeration Capacity → Pond Carrying Capacity.",
          "Consider this real-world comparison between two adjacent ponds:",
          "Pond A stocks 100 PL/m² into an unlined earth pond. Because water conditions are strained, survival drops to 50%, and shrimp stall at an ABW of 15 grams. Standing harvest biomass is 0.75 kg/m² (7.5 MT/ha). The crop survived, but feed conversion ratio (FCR) inflated and profits vanished.",
          "Pond B stocks only 80 PL/m² in a properly aerated pond. Excellent bottom conditions maintain 85% survival, and shrimp thrive to a premium 25-gram jumbo harvest size (Size 40). Standing harvest biomass reaches 1.70 kg/m² (17.0 MT/ha)—more than double the waste output, feed demand, and oxygen consumption of Pond A, despite starting with 20% fewer seed!",
          "Therefore, successful farm managers calculate backward: determine your pond's maximum safe carrying capacity and aeration limit first, then deduce your target stocking density.",
        ],
      },
      {
        heading: "Free Vannamei Stocking Density Calculator",
        body: [
          "Use the interactive calculator below to model your pond cycle before placing your hatchery seed order. Adjust pond surface area, target density, expected survival rate, and target harvest weight (ABW) to simulate total post-larvae needed, required aeration horsepower, and overall biological load.",
          "Standard benchmark example: A 2,500 m² pond stocked at 100 PL/m² requires 250,000 post-larvae. At 75% survival and a 20-gram target harvest size (Count 50), the pond will produce 3,750 kg (3.75 metric tons) of shrimp. Supporting this standing crop safely requires 8 to 10 HP of operational aeration at peak harvest.",
        ],
        note: "Always include a 5% to 10% acclimation buffer when ordering seed. For example, if your pond calculation calls for 250,000 PL, order 262,500 to 275,000 PL to account for packing count variances and post-transport acclimation stress.",
      },
      {
        heading: "Biological carrying capacity and aeration rules",
        body: [
          "Biological carrying capacity is the maximum total weight of shrimp that a pond ecosystem can sustain without water quality deteriorating or growth collapsing. In modern vannamei farming, carrying capacity is almost entirely dictated by oxygen supply and bottom waste disposal.",
          "The golden rule of commercial shrimp aeration (established by Dr. Claude Boyd and reinforced by FAO guidelines) is: 1 Horsepower (HP) of mechanical aeration supports 400 to 500 kg of standing shrimp biomass.",
          "Early in the cycle (DOC 1–30), natural algal photosynthesis and minimal paddlewheel operation easily meet the oxygen demand of small postlarvae. But after DOC 60, oxygen demand rises exponentially due to the combined respiration of high shrimp biomass, nitrifying bacteria, and organic sludge decomposition.",
          "If pre-dawn dissolved oxygen (DO) drops below 4.0 mg/L, shrimp stop feeding efficiently, Average Daily Gain (ADG) flattens, and susceptibility to Vibrio and White Feces Syndrome multiplies.",
        ],
        table: {
          columns: ["Standing Biomass (kg)", "Biomass Density (2,500 m² Pond)", "Minimum Aeration (1 HP / 500 kg)", "Recommended Aeration (1 HP / 400 kg)", "Pond Bottom & Sludge Management"],
          rows: [
            ["1,000 kg", "0.40 kg/m²", "2.0 HP", "2.5 HP", "Clean pond bottom; natural soil mineralization active; light aerator operation."],
            ["2,000 kg", "0.80 kg/m²", "4.0 HP", "5.0 HP", "Early sludge accumulation in center; paddlewheels running throughout night."],
            ["3,500 kg", "1.40 kg/m²", "7.0 HP", "8.8 HP", "Heavy organic load; central drain flushing mandatory; continuous aeration from midnight."],
            ["5,000 kg", "2.00 kg/m²", "10.0 HP", "12.5 HP", "Near intensive carrying capacity limit; requires HDPE lining and daily siphon extraction."],
            ["7,500 kg+", "3.00+ kg/m²", "15.0 HP", "18.8 HP+", "Super-intensive load; pure oxygen/venturi diffusers and automatic generator backup mandatory."],
          ],
        },
      },
      {
        heading: "Warning signs of an overstocked shrimp pond",
        body: [
          "Overstocking beyond pond carrying capacity does not always result in sudden catastrophic mortality. More often, it causes chronic sub-lethal stress that ruins cycle profitability. Watch for these distinct signs during daily inspections and sampling:",
        ],
        items: [
          "Crowding near aerators during daylight: Shrimp clustering in aerator wash streams during the day are starved for dissolved oxygen or fleeing toxic hydrogen sulfide on the pond bottom.",
          "Wide size variation in weekly sampling: A cast net containing both large 18g shrimp and stunted 9g shrimp indicates severe feeding competition caused by excessive stocking numbers.",
          "Pre-dawn Dissolved Oxygen < 3.8 mg/L: Bottom DO between 4:00 AM and 5:30 AM dropping below 3.8 mg/L confirms that pond biomass has outgrown existing aerator horsepower.",
          "Persistent brown surface foam: Thick, stable brownish scum accumulating downwind indicates high dissolved organic compounds from excess fecal waste and dying phytoplankton blooms.",
          "Growth plateau past DOC 50: Average Daily Gain (ADG) dropping below 0.15 g/day despite clean feed trays signals that the pond has reached its density threshold.",
          "Soft shells and dirty gills: High stocking density elevates toxic ammonia (TAN > 1.0 mg/L) and nitrite (NO2-N > 0.5 mg/L), impairing post-molt calcification.",
        ],
      },
      {
        heading: "Likely causes of stocking failures and how to check them",
        body: [
          "1. Aeration undersized for peak biomass: Farmers often install aeration based on Day 30 conditions rather than Day 80 harvest biomass. Verification clue: DO is 6.5 mg/L at 2:00 PM but collapses to 2.8 mg/L at 4:30 AM.",
          "2. Misjudged initial survival causing overfeeding: Assuming 85% survival when real survival is 60% leads to massive daily feed over-allocation, poisoning pond soil. Verification clue: Cast net sample counts show far fewer shrimp than feed tables expect, accompanied by blackened pond mud.",
          "3. Sludge cone expanding beyond the central pit: At densities above 100 PL/m², organic waste accumulation outpaces water current velocity, burying feeding areas in toxic anaerobic silt. Verification clue: Cast net retrieved with foul, black sulfide-smelling mud on weights.",
          "4. Stocking uncertified postlarvae with low vigor: Weak seed without SPF (Specific Pathogen Free) certification suffers high mortality in the first 14 days, forcing surviving shrimp into an uneven cycle. Verification clue: Seed failing a 100-PL thermal or formalin stress test prior to pond release.",
        ],
      },
      {
        heading: "What to do immediately when biomass threatens carrying capacity",
        body: [
          "If your weekly sampling indicates that standing biomass is nearing or exceeding your aeration support capacity (more than 500 kg biomass per horsepower), act immediately to prevent an irreversible crop crash:",
          "1. Execute a partial harvest (crop thinning): Drain 20% to 35% of the largest shrimp using a cast net or trap harvest. Thinning instantly reduces oxygen consumption, cuts daily feed demand, and gives remaining shrimp space to resume rapid growth.",
          "2. Re-align and reposition aerators: Direct paddlewheel flow to create a strong circular current that sweeps bottom detritus tightly into the central drain pit, leaving clean feeding zones along the perimeter dikes.",
          "3. Trim daily feed rations by 15% to 25%: If pre-dawn DO is below 4.0 mg/L or nitrite exceeds 0.5 mg/L, cut feed immediately. Overstocked shrimp cannot digest feed efficiently in hypoxic water, and uneaten pellets will accelerate water degradation.",
        ],
        note: "Never increase feed or add raw nitrogen fertilizers in an attempt to force slow-growing shrimp to 'catch up' in an overstocked pond. Excess protein rots into toxic un-ionized ammonia (NH3) and lethal hydrogen sulfide (H2S), triggering mass mortality.",
      },
      {
        heading: "Long-term stocking strategy and cycle management",
        body: [
          "Sustainable shrimp farming requires matching stocking density to seasonal environmental conditions and infrastructure upgrades:",
          "Implement a dedicated nursery phase: Nursing post-larvae (PL10 to PL12) in small, high-aeration nursery tanks for 18 to 25 days until they reach 0.5 to 1.0 gram juvenile size improves overall survival by 15% to 20%. It also shortens grow-out pond residency by nearly a month, significantly lowering disease risk.",
          "Adjust density by season: Lower stocking density by 20% to 30% during the rainy season or cold months when photosynthetic oxygen generation is weak and sudden storms cause pond stratification.",
          "Track cycle metrics in real time: Use Shrimply to log weekly cast net sample weights, monitor MBW trends, and check standing biomass against your installed aerator horsepower before stocking each cycle.",
        ],
      },
    ],
    checklist: [
      "Calculate target stocking density backward from your aerator capacity (1 HP per 400–500 kg peak biomass).",
      "Order post-larvae with a 5% to 10% acclimation buffer to absorb transport stress.",
      "Audit pre-dawn dissolved oxygen (4:00 AM – 5:30 AM) daily, maintaining bottom DO strictly above 4.0 mg/L.",
      "Conduct weekly cast net sampling to track ABW, verify ADG, and monitor real standing biomass.",
      "Schedule a partial harvest if biomass approaches 85% of your pond's aeration limit before target market size.",
      "Log stocking records, sampling weights, and daily feed directly in Shrimply to avoid carrying capacity surprises.",
    ],
    sources: [sources.faoStockingStudy, sources.faoVannamei, sources.boydAeration, sources.seafdecBmp],
  },
  {
    slug: "shrimp-cycle-planning",
    section: "Farm Management",
    label: "Farm Management",
    author: defaultResourceAuthor,
    reviewer: defaultOperationsReviewer,
    title: "Shrimp Cycle Planning: From Stocking to Harvest Without Guesswork",
    description: "A practical guide to planning a vannamei shrimp crop cycle with stocking targets, feed demand, sampling checkpoints, risk reviews, and harvest timing.",
    readTime: "6 min read",
    tags: ["cycle planning", "stocking", "harvest timing", "feed demand", "vannamei"],
    publishedAt: "2026-06-08",
    image: {
      src: "/resources/images/shrimp-cycle-planning-stocking-harvest-vannamei.jpg",
      alt: "Shrimp cycle planning infographic for vannamei farms from stocking and feed demand to sampling checkpoints, risk review, and harvest window",
      width: 1672,
      height: 941,
    },
    relatedFeature: { label: "Vannamei App", href: "/vannamei-shrimp-farming-app" },
    takeaways: [
      "A cycle plan should define target size, stocking density, feed demand, and review points.",
      "Sampling checkpoints help farms adjust feed and harvest timing before the final weeks.",
      "Disease and water-quality risk should be included in planning, not treated as separate work.",
    ],
    faqs: [
      {
        question: "What stocking density should I use for vannamei shrimp?",
        answer: "There is no single safe density for every farm. Baseline commercial densities range from 5–15 PL/m² for extensive ponds up to 60–150 PL/m² for intensive lined ponds with dedicated aeration. Use our Vannamei Stocking Density Calculator to simulate seed requirements, aeration demand, and pond carrying capacity.",
      },
      {
        question: "How do I plan a shrimp crop from stocking to harvest?",
        answer: "Define the target harvest size and window, initial stocking plan, expected survival, feed demand, sampling checkpoints, water-quality review points, disease-risk actions, and cash requirements. Then adjust the plan using actual sampling, feed, mortality, and harvest records.",
      },
    ],
    sections: [
      {
        heading: "What a useful cycle plan includes",
        body: [
          "A shrimp cycle plan should start with pond, seed source, stocking date, stocking count, expected survival, target harvest size, expected DOC, feed budget, and water-quality monitoring routine. These details create the baseline for every future decision.",
          "Planning matters because vannamei production is sensitive to stocking density, feed management, water stability, and disease prevention. A crop plan gives the manager a reference point when growth slows or feed response changes.",
        ],
      },
      {
        heading: "Plan the review rhythm before stocking",
        body: [
          "Farms should decide when sampling begins, how often MBW is measured, which water-quality readings are checked daily, and when management meetings happen. Without that rhythm, records are collected unevenly and the cycle becomes harder to interpret.",
          "A simple rhythm is daily water and feed checks, weekly pond review, and scheduled sampling once shrimp are large enough to measure reliably. The exact cadence depends on local system, density, and farm SOP.",
        ],
      },
      {
        heading: "Connect planning to harvest and cash",
        body: [
          "Good cycle planning also estimates when feed demand will peak, when partial harvest might be useful, and when cash outflows will be highest. This links biological performance to business planning instead of leaving finance until the pond is harvested.",
        ],
      },
    ],
    checklist: [
      "Define stocking, target harvest size, expected survival, and harvest window.",
      "Estimate feed demand and reorder timing before the cycle starts.",
      "Schedule sampling and weekly pond reviews.",
      "Include disease and water-quality risk checks in the plan.",
    ],
    sources: [sources.faoVannamei, sources.seafdecBmp, sources.profitabilityReview],
  },
  {
    slug: "shrimp-farm-record-keeping",
    section: "Farm Management",
    label: "Farm Management",
    author: defaultResourceAuthor,
    reviewer: defaultOperationsReviewer,
    title: "Shrimp Farm Record Keeping: What to Track Daily, Weekly, and Per Cycle",
    description: "See which shrimp farm records matter most for feed control, water quality, growth sampling, mortality, harvests, and financial performance.",
    readTime: "7 min read",
    tags: ["record keeping", "daily logs", "water quality", "feeding", "mortality"],
    publishedAt: "2026-06-08",
    image: {
      src: "/resources/images/shrimp-farm-record-keeping-daily-weekly-cycle.jpg",
      alt: "Shrimp farm manager reviewing daily and weekly record keeping for feed use, water quality, mortality, MBW, ADG, biomass, and survival",
      width: 1448,
      height: 1086,
    },
    relatedFeature: { label: "Farm Software", href: "/shrimp-farm-management-software" },
    takeaways: [
      "Farm records are management tools, not paperwork.",
      "Daily logs should capture feed, water quality, mortality, and unusual pond observations.",
      "Cycle records should connect biological results to cost and harvest outcomes.",
    ],
    sections: [
      {
        heading: "Why record keeping changes farm decisions",
        body: [
          "Farm records help managers learn from each pond instead of relying on memory. The FAO record-keeping guidance for aquaculture highlights feed distribution, water quality, production, and stock records as tools for commercial management.",
          "For shrimp farms, the highest-value records are usually feed use, feed stock, water quality, sampling, mortality, treatments, harvest, and costs. These records become more powerful when they are tied to the same pond and cycle.",
        ],
      },
      {
        heading: "Daily records",
        body: [
          "Daily records should answer: what was fed, what was observed, what changed in water quality, and whether mortality or abnormal behavior appeared. Feed records should also identify feed type or batch where possible, because poor feed quality or inconsistent handling can affect results.",
          "Water records should include time of measurement because readings such as dissolved oxygen and pH move through the day. A morning reading and an afternoon reading can tell different stories.",
        ],
      },
      {
        heading: "Weekly and cycle records",
        body: [
          "Weekly records should summarize MBW, ADG, biomass estimate, survival estimate, feed consumption, and water trend. Cycle records should include stocking, harvest, cost, revenue, feed total, treatments, and final notes on what changed.",
        ],
      },
    ],
    checklist: [
      "Track daily feed, water quality, mortality, and unusual observations.",
      "Record feed type, feed movement, and stock balance.",
      "Keep sampling and harvest data connected to the same pond cycle.",
      "Review records weekly while there is still time to act.",
    ],
    sources: [sources.faoRecords, sources.faoFeedRecords, sources.faoVannamei],
  },
  {
    slug: "vannamei-growth-chart",
    section: "Growth and Sampling",
    label: "Growth and Sampling",
    author: defaultResourceAuthor,
    reviewer: defaultTechnicalReviewer,
    title: "Vannamei Shrimp Growth Chart: Expected ABW, ADG and Weight by DOC",
    description: "Track expected Pacific white shrimp (Litopenaeus vannamei) weight by day of culture (DOC). Benchmark your average body weight (ABW), daily growth rate (ADG), and shrimp count per kg.",
    readTime: "7 min read",
    tags: [
      "vannamei growth chart",
      "vannamei growth rate",
      "shrimp growth by DOC",
      "vannamei weight by day",
      "vannamei ADG",
      "average daily growth shrimp",
      "shrimp ABW",
      "expected shrimp weight",
      "vannamei size chart",
      "vannamei 30 days weight",
      "vannamei 60 days weight",
      "vannamei 90 days weight",
    ],
    publishedAt: "2026-08-29",
    image: {
      src: "/resources/images/vannamei-growth-chart-abw-adg-doc.png",
      alt: "Shrimply infographic showing expected vannamei shrimp growth curve, ABW, and ADG across days of culture from DOC 30 to DOC 120",
      width: 1672,
      height: 941,
    },
    updatedAt: "2026-09-12",
    relatedFeature: { label: "Growth & Sampling Software", href: "/shrimp-growth-sampling-software" },
    takeaways: [
      "Vannamei shrimp typically reach 10–12 g by DOC 60 and 18–22 g by DOC 90 in commercial semi-intensive ponds.",
      "Healthy shrimp gain between 0.25 g and 0.35 g every day (ADG) during their peak growing period between Day 45 and Day 80.",
      "Never increase feed just because growth slows down; always check morning oxygen levels and feed trays first.",
    ],
    faqs: [
      {
        question: "What is the expected weight of Vannamei shrimp at 30, 60, and 90 days?",
        answer: "Under standard commercial conditions (60–120 PL/m², 28–32°C), Vannamei shrimp weigh 3.2–4.5 g at DOC 30, 10.5–12.5 g at DOC 60, and 18.5–22.0 g at DOC 90.",
      },
      {
        question: "What is a good ADG (Average Daily Gain) for Vannamei shrimp?",
        answer: "Target an ADG of 0.10–0.15 g/day during the nursery stage (DOC 1–30), accelerating to 0.25–0.35 g/day during peak growth (DOC 45–80), and tapering to 0.20–0.26 g/day past DOC 90.",
      },
      {
        question: "How long does it take for Vannamei shrimp to reach market harvest size?",
        answer: "Vannamei shrimp reach standard commercial market size (20 grams or 50 pcs/kg) in 85 to 100 days. Reaching larger sizes (28–32 grams or 30–35 pcs/kg) typically requires 115 to 130 days.",
      },
      {
        question: "Why are my shrimp not growing even though feed trays are clean?",
        answer: "A clean tray only shows feed was removed from that tray. If weight is flat, survival may be higher than estimated (leaving shrimp underfed per animal), feed distribution may be uneven, or shrimp may have an EHP microsporidian infection that impairs nutrient absorption.",
      },
      {
        question: "How do you convert shrimp average weight (ABW) into count size per kilogram?",
        answer: "Divide 1,000 by the Average Body Weight (ABW in grams). For example, 1,000 divided by 11.5 g equals approximately 87 shrimp per kilogram.",
      },
      {
        question: "Does high stocking density slow down individual shrimp growth?",
        answer: "Yes. In ponds stocked above 120–150 shrimp/m², higher competition for space and dissolved minerals generally slows individual growth rates by 15% to 25% compared to lower-density ponds. Farmers can model safe density and aeration limits using our Vannamei Stocking Density Calculator.",
      },
    ],
    sections: [
      {
        heading: "Quick answer: What normal shrimp growth looks like",
        body: [
          "Healthy Pacific white shrimp (Litopenaeus vannamei) typically reach 10 to 12 grams by Day 60 (DOC 60) and 18 to 22 grams by Day 90 (DOC 90) in commercial semi-intensive and intensive ponds.",
          "Growth starts slowly during the first 30 days (gaining 0.10 to 0.15 g/day), accelerates past Day 40 (often exceeding 0.25 to 0.35 g/day), and naturally levels off as ponds near carrying capacity. If your shrimp gain less than 0.18 g/day after DOC 45, check overnight dissolved oxygen and feed tray clearance immediately.",
        ],
      },
      {
        heading: "Why tracking shrimp growth matters",
        body: [
          "Feed represents 50% to 60% of total farm expenditure. If growth slows while feed amounts continue rising, uneaten feed accumulates on the pond bottom, deteriorating water quality and inflating your Feed Conversion Ratio (FCR).",
          "Accurate weights also allow you to track real pond biomass so mechanical aeration capacity is never exceeded, while ensuring harvest windows align with buyer size premiums.",
        ],
      },
      {
        heading: "Vannamei growth chart by Day of Culture (DOC)",
        body: [
          "The table below shows target growth ranges for L. vannamei in standard commercial ponds (stocking density 60–120 PL/m², water temperature 28–32°C, salinity 15–25 ppt, 35–38% protein feed).",
        ],
        table: {
          columns: ["DOC (Days)", "Expected ABW (g)", "Typical ADG (g/day)", "Size (Count / kg)", "Production Context & Milestones"],
          rows: [
            ["DOC 30", "3.2 – 4.5 g", "0.10 – 0.15 g/day", "220 – 310 pcs/kg", "Nursery to juvenile feed transition; first cast net sampling."],
            ["DOC 45", "6.5 – 8.2 g", "0.20 – 0.26 g/day", "120 – 155 pcs/kg", "Fast-growth stage begins; feed tray monitoring becomes critical."],
            ["DOC 60", "10.5 – 12.5 g", "0.25 – 0.32 g/day", "80 – 95 pcs/kg", "Mid-cycle milestone; biomass rises rapidly, increasing oxygen demand."],
            ["DOC 75", "14.5 – 17.0 g", "0.28 – 0.35 g/day", "58 – 70 pcs/kg", "Peak daily weight gain; watch nighttime oxygen drops closely."],
            ["DOC 90", "18.5 – 22.0 g", "0.25 – 0.33 g/day", "45 – 55 pcs/kg", "Standard commercial harvest size (Size 50); evaluate partial harvesting."],
            ["DOC 105", "22.5 – 26.0 g", "0.22 – 0.30 g/day", "38 – 45 pcs/kg", "Growth naturally tapers; feed efficiency declines as biomass peaks."],
            ["DOC 120", "26.0 – 30.5 g", "0.18 – 0.26 g/day", "32 – 38 pcs/kg", "Large count market size (Size 30); high risk period for water quality."],
          ],
        },
        note: "Growth rates vary with stocking density, temperature, and feeding regime. High-density ponds (>150 pcs/m²) typically experience slower individual growth rates (0.18–0.22 g/day).",
      },
      {
        heading: "How to calculate your Average Daily Gain (ADG)",
        body: [
          "Shrimp do not grow strictly by calendar days—they grow based on their Average Daily Gain (ADG) between consecutive samplings.",
          "Formula: ADG (g/day) = (Current Weight − Previous Weight) / Days Between Samplings",
          "For example, if your shrimp weighed 5.4 g on Day 48 and 7.2 g on Day 55 (7 days later), the weight gain is 1.8 g divided by 7 days = 0.26 g/day. At this rate, expected ABW at next week's sampling is 9.0 g.",
        ],
      },
      {
        heading: "Warning signs of growth stalls",
        body: [
          "Catching a growth slowdown early saves thousands in wasted feed. Look for these indicators during weekly sampling and daily feed checks:",
        ],
        items: [
          "Wide size variation: Big gaps between large and small shrimp in the cast net suggest feeding competition or subclinical disease.",
          "Leftover feed on trays: Uneaten feed after 2 to 2.5 hours signals an immediate appetite drop.",
          "Empty digestive tracts: Clear or watery guts during daytime feeding hours indicate poor grazing or gut irritation.",
          "ADG drop below 0.18 g/day (past DOC 45): A growth decline of more than 25% compared to the prior week.",
          "Overnight Dissolved Oxygen (DO) < 3.8 mg/L: Sub-lethal oxygen stress stalls growth even if mortality is zero.",
        ],
      },
      {
        heading: "Likely causes and how to verify them",
        body: [
          "1. Sub-lethal overnight hypoxia (Low DO): Measure DO between 4:00 AM and 6:00 AM at the pond bottom. Readings below 3.8 mg/L force shrimp into survival mode instead of growth.",
          "2. Underfeeding or poor distribution: Trays clear within 45 minutes, but net sampling shows high size variation because strong shrimp outcompete smaller ones.",
          "3. Pond carrying capacity reached: Growth plateaus after DOC 75 as pond biomass exceeds available aerator horsepower (minimum 1 HP per 400–500 kg biomass).",
          "4. Mineral imbalance: Alkalinity below 100 mg/L CaCO3 makes shell hardening difficult after molting.",
          "5. Chronic gut microsporidia (EHP): Trays clear normally, but ADG remains stuck under 0.12 g/day with chalky white feces.",
        ],
      },
      {
        heading: "What to do immediately when growth stalls",
        body: [
          "First, audit early-morning DO immediately to ensure bottom DO stays above 4.0 mg/L before sunrise.",
          "Second, if feed trays have leftovers, trim daily rations by 15% to 20% right away to protect water quality.",
          "Third, test pond alkalinity and maintain 120–160 mg/L using sodium bicarbonate or agricultural lime.",
          "Do not pour extra feed into the pond to 'catch up' on lost weight. Extra feed rots on the pond bed and causes toxic ammonia spikes.",
        ],
      },
    ],
    checklist: [
      "Sample shrimp at the same time and day every week using a clean cast net.",
      "Calculate ADG between weekly samplings to spot slowdowns before they become crises.",
      "Measure dissolved oxygen before sunrise (4:00 AM – 6:00 AM) to prevent low-oxygen stress.",
      "Adjust daily feeding based on 2-hour tray checks, not just calendar days.",
      "Log your weekly weights directly into Shrimply to track trends and projected harvest dates.",
      "Contact a certified aquatic lab for PCR testing if growth halts for over 14 days.",
    ],
    sources: [sources.faoVannamei, sources.wasShrimpGrowth, sources.boydAeration, sources.faoPondProblemGuide],
  },
  {
    slug: "slow-shrimp-growth-adg-troubleshooting",
    section: "Growth and Sampling",
    label: "Growth and Sampling",
    author: defaultResourceAuthor,
    reviewer: defaultTechnicalReviewer,
    title: "Slow Shrimp Growth: An ADG Troubleshooting Guide for Vannamei Farms",
    description: "Why is shrimp growth slow? Use MBW, ADG, feed-tray response, water-quality trends, survival, and health observations to find the reason before the harvest plan drifts.",
    readTime: "8 min read",
    tags: ["slow shrimp growth", "ADG", "average daily growth", "MBW", "biomass", "survival", "vannamei growth", "size variation", "growth sampling"],
    publishedAt: "2026-07-10",
    image: {
      src: "/resources/images/slow-shrimp-growth-adg-troubleshooting-vannamei.png",
      alt: "Shrimply infographic for troubleshooting slow vannamei shrimp growth using sampling, biomass and survival validation, feed-tray response, water-quality trends, and health checks",
      width: 1672,
      height: 941,
    },
    updatedAt: "2026-09-12",
    relatedFeature: { label: "Growth & Sampling Software", href: "/shrimp-growth-sampling-software" },
    takeaways: [
      "Slow growth is a pattern to investigate, not a diagnosis by itself.",
      "Confirm sampling, biomass, and survival before changing feed, treatments, or the harvest plan.",
      "The useful review connects MBW and ADG with feed response, water trends, survival, stocking pressure, and health observations.",
    ],
    faqs: [
      {
        question: "Why are my shrimp growing slowly?",
        answer: "Slow growth can be associated with inconsistent sampling, inaccurate biomass or survival estimates, feed distribution, weak appetite, water-quality stress, crowding, weather changes, and health problems such as EHP. Review the full pond pattern before assuming a single cause.",
      },
      {
        question: "How do I calculate ADG in shrimp farming?",
        answer: "ADG is the change in average body weight divided by the days between two comparable samplings: ADG = (latest MBW − previous MBW) / days between samples. If only one valid sampling exists, compare it with the stocking weight and elapsed days, while noting that this estimate is less reliable.",
      },
      {
        question: "What does a clean feed tray mean when shrimp MBW is flat?",
        answer: "A clean tray shows feed was removed from that tray, not that the ration or biomass estimate is correct. Verify survival and biomass, feed distribution, tray placement, shrimp condition, water trends, size variation, and health signs before increasing feed.",
      },
    ],
    sections: [
      {
        heading: "Slow growth is a warning signal—act before feed becomes waste",
        body: [
          "Slow growth is not one problem with one cure. It is a warning that the pond is not converting feed, water conditions, and stock potential into expected weight gain. Treat it as a pattern when MBW or ADG repeatedly misses the farm's crop plan, size variation increases, or feed use rises without matching biomass gain.",
          "Do not automatically increase feed. First confirm the data, then identify what is limiting growth. There is no universal ADG target that fits every vannamei farm: density, pond system, season, salinity, feed, aeration, disease pressure, and target harvest size all affect what is realistic.",
        ],
      },
      {
        heading: "Step 1: Confirm that growth is genuinely slow",
        body: [
          "Calculate average daily growth as: ADG = (latest MBW − previous MBW) / days between samplings. Compare two or more consistent samplings and record DOC, sample count, sampling area, MBW, size variation, feed issued, mortality, and recent water-quality readings.",
          "One low sample does not always mean a growth problem. If MBW and ADG remain weak over comparable samplings, treat it as a real pond-performance issue. If one reliable sampling is missing or uncertain, label it as uncertain and schedule the next sampling before making a major feed or harvest decision.",
        ],
      },
      {
        heading: "Step 2: Read clean trays correctly",
        body: [
          "A clean tray means feed was removed from that tray. It does not prove that shrimp are growing well, that the ration is correct, or that the pond needs more feed. If trays are consistently clean but MBW is flat, first verify whether actual survival and biomass are higher than estimated. Underestimating shrimp numbers can leave the pond underfed per unit of biomass, so trays may clear quickly while individual growth slows.",
          "Then review feed distribution across the full pond, tray placement, shrimp gut fullness and condition, size variation, water-quality trends, mortality, and health-risk signs. If trays have leftovers, appetite is weak, or shrimp are inactive, do not increase feed. Hold or adjust the ration gradually under the farm SOP while checking water quality and health.",
        ],
      },
      {
        heading: "Step 3: Correct water conditions before pushing feed",
        body: [
          "Water stress can reduce appetite and growth before a visible crisis occurs. Review the recent trend for dissolved oxygen, pH, temperature, salinity, ammonia, and nitrite—not a single reading. If oxygen is falling or appetite drops, inspect aerators, check for dead zones, organic load, algae changes, and recent feed increases. Do not increase feed until appetite and water stability recover.",
          "If ammonia or nitrite is rising, stop ration increases, reduce avoidable feed waste, and review pond-bottom condition, aeration, and the farm's approved water-management procedure. Recheck readings after corrective action. Fixing the pond environment is often more important than changing the feed table.",
        ],
      },
      {
        heading: "Step 4: Recalculate survival and biomass",
        body: [
          "Feed decisions should be based on actual biomass, not only the original stocking plan. Review mortality, cast-net observations, sample counts, and shrimp condition. If survival has been underestimated, the pond may have more shrimp competing for the same ration than expected. If mortality has been missed, the farm may be overestimating biomass and issuing too much feed.",
          "Update estimated population and biomass before setting the next feed plan. When biomass is lower or higher than expected, do not change feed automatically: first confirm how many shrimp remain, whether they are eating, and whether pond conditions can support growth.",
        ],
      },
      {
        heading: "Step 5: Rule out health problems without guessing",
        body: [
          "Persistent slow growth, uneven size, poor FCR, pale or empty gut, weak appetite, soft shell, white feces, or chronic mortality may point to a health issue as well as a feed or water problem. Slow growth alone cannot diagnose EHP, WFD, Vibrio-related disease, or another condition.",
          "Record the pattern by pond and DOC, control movement of nets, boots, tools, water, sludge, and staff between suspect and unaffected ponds, and seek appropriate laboratory or veterinary support when the pattern persists. Do not use medication as a substitute for evidence, water stability, or a controlled response plan.",
        ],
      },
      {
        heading: "A practical 48-hour response plan",
        body: [
          "Today: validate MBW, ADG, sample method, and sample count; check feed trays, shrimp behaviour, mortality, and aeration; record water-quality readings and weather; and do not increase feed until the pond review is complete.",
          "Tomorrow: compare the last three to five sampling, water-quality, appetite, feed, and mortality records; identify the clearest operational issue; and correct it gradually while documenting the action. At the next sampling, recalculate MBW, ADG, survival, biomass, and FCR. If growth remains weak or health signs increase, escalate diagnostics rather than repeating unproven actions.",
        ],
      },
      {
        heading: "Confirm recovery with records",
        body: [
          "A pond has not recovered just because trays are clean or water looks better for one day. Confirm recovery through improved appetite, stable water trends, realistic mortality records, and better MBW and ADG at the next comparable sampling.",
          "Shrimply helps the team connect sampling, feed logs, water trends, mortality, disease notes, and harvest planning in one pond record—so the farm can see whether an action actually improved growth.",
        ],
      },
    ],
    checklist: [
      "Confirm MBW, sample count, sample method, and days between samplings before acting on ADG.",
      "Validate survival and biomass before increasing feed when trays are clean but MBW is flat.",
      "Review feed distribution, tray placement, shrimp condition, water trends, mortality, and size variation together.",
      "Do not increase feed into weak appetite or unstable water.",
      "Correct the clearest operational issue gradually and document the action.",
      "Escalate persistent slow growth or abnormal signs through the farm's biosecurity, diagnostic, and veterinary process.",
    ],
    sources: [sources.faoVannamei, sources.faoFeedManagement, sources.seafdecBmp, sources.woahEhpDiseaseCard],
  },
  {
    slug: "fcr-shrimp-farming",
    section: "Feed and Inventory",
    label: "Feed and Inventory",
    author: defaultResourceAuthor,
    reviewer: defaultNutritionReviewer,
    title: "Improving FCR in Shrimp Farming: How to Use Feed Conversion Ratio Correctly",
    description: "Understand shrimp feed conversion ratio, why FCR matters, what can distort it, and how farms can improve FCR with better feed, biomass, mortality, and harvest records.",
    readTime: "7 min read",
    tags: ["FCR", "improving FCR", "feed conversion ratio", "feed waste", "biomass", "partial harvest"],
    publishedAt: "2026-06-08",
    image: {
      src: "/resources/images/shrimp-fcr-feed-conversion-ratio-farming.jpg",
      alt: "Shrimp farmer calculating FCR with feed conversion ratio formula, feed used, biomass gain, water quality, appetite, and weekly FCR review",
      width: 1535,
      height: 1024,
    },
    updatedAt: "2026-09-12",
    relatedFeature: { label: "Feed Management Software", href: "/shrimp-feed-management-software" },
    takeaways: [
      "FCR compares feed used against biomass gained, but bad records can make it misleading.",
      "Mortality, partial harvests, sampling quality, and feed stock errors all affect FCR.",
      "FCR should be reviewed with growth, water quality, survival, and feed behavior.",
    ],
    faqs: [
      {
        question: "How do I calculate FCR in shrimp farming?",
        answer: "Calculate FCR as total feed used divided by biomass gained. For a useful pond result, include every partial harvest, final harvest, and remaining biomass, then subtract initial stocked biomass where reliable records exist.",
      },
      {
        question: "Why is my shrimp FCR increasing?",
        answer: "A rising FCR can be linked to excess feed, weak appetite, inaccurate biomass estimates, missed mortality, incomplete harvest records, water-quality stress, or feed stock errors. Review feed trays, DO, ammonia, nitrite, sampling, mortality, and harvest entries together before changing the ration.",
      },
    ],
    sections: [
      {
        heading: "The basic shrimp FCR formula",
        body: [
          "The standard formula is: FCR = total feed used / biomass gained. If a pond used 10,000 kg of feed and gained 8,000 kg of shrimp biomass, the FCR is 1.25.",
          "For shrimp ponds, biomass gained should account for the crop result, not just the final standing biomass. A practical farm formula is: FCR = total feed used / (harvested biomass + remaining biomass - initial stocked biomass). Many farms use initial stocked biomass as a small correction because post-larvae are tiny, but it is still more accurate to include it when the data exists.",
          "For ponds with partial harvests, add every partial harvest to the biomass result. Otherwise the farm may overstate feed use against only the final harvest and make FCR look worse than it really was.",
        ],
      },
      {
        heading: "What FCR tells a shrimp farm",
        body: [
          "Feed conversion ratio is one of the most important production indicators because feed is a major operating cost in shrimp farming. A lower FCR usually means feed is being converted into shrimp biomass more efficiently, but the number only helps if feed and biomass records are accurate.",
          "FAO material on vannamei notes that systems such as bacterial floc can reduce dependence on high-protein feeds and improve cost efficiency. That reinforces the practical point: FCR is connected to the whole culture system, not only the feeding table.",
        ],
      },
      {
        heading: "Why FCR can be wrong",
        body: [
          "FCR can be distorted when feed movement is not recorded, mortality is missed, harvest weights are incomplete, or sampling overestimates biomass. Partial harvests can also confuse FCR if harvested biomass is not tied back to the pond cycle.",
          "Farmers should avoid treating FCR as a standalone score. A pond with low growth and low feed use may look efficient but still miss the harvest target. A pond with high feed use and poor water quality may show the opposite problem.",
        ],
      },
      {
        heading: "How to use FCR every week",
        body: [
          "Use FCR as a question generator. If FCR is rising, check appetite, tray returns, DO, ammonia, nitrite, mortality, and recent sampling accuracy. Improving FCR in shrimp farming usually comes from tighter feed records, better biomass estimates, cleaner tray interpretation, and earlier response to water-quality stress. If FCR improves sharply, check whether biomass or harvest records are complete before assuming performance improved.",
          "Use the Vannamei Feeding Rate Chart & Calculator to set a biomass-based starting ration, then confirm it with trays, water quality, and recent pond records.",
        ],
      },
    ],
    checklist: [
      "Use actual feed issued to the pond, not estimated bags.",
      "Keep mortality and harvest records current.",
      "Review FCR beside MBW, ADG, biomass, and water quality.",
      "Investigate sudden FCR changes instead of celebrating or blaming too quickly.",
    ],
    sources: [sources.faoVannamei, sources.faoFeedManagement, sources.profitabilityReview],
  },
  {
    slug: "shrimp-feed-index-calculation",
    section: "Feed and Inventory",
    label: "Feed and Inventory",
    author: defaultResourceAuthor,
    reviewer: defaultNutritionReviewer,
    title: "Shrimp Feed Index: How to Calculate Daily Feed Without Guessing",
    description: "Learn how the shrimp feed index method estimates daily feed from DOC, population, and target ADG—and how to adjust it using real pond data.",
    readTime: "8 min read",
    tags: ["shrimp feed index", "feed index formula", "daily shrimp feed", "DOC", "ADG", "feed rate"],
    publishedAt: "2026-08-28",
    image: {
      src: "/resources/images/shrimp-feed-index-calculation-infographic.png",
      alt: "Shrimply infographic showing how DOC, shrimp population, target ADG, feed trays, sampling, water quality, and mortality guide a daily feed-index calculation",
      width: 1672,
      height: 941,
    },
    updatedAt: "2026-09-12",
    relatedFeature: { label: "Feed Management Software", href: "/shrimp-feed-management-software" },
    takeaways: [
      "Feed index provides a starting daily ration from DOC, population, and target ADG.",
      "Feed trays, sampling, survival, mortality, partial harvests, and water quality must guide the final amount.",
      "Feed index plans forward, while FCR reviews how efficiently past feed produced biomass.",
    ],
    faqs: [
      {
        question: "How do I calculate the shrimp feed index ration?",
        answer: "A commonly used formula is: daily feed in kg = DOC × shrimp population × (feed index ÷ 100) ÷ 1,000. Treat the answer as a starting ration and adjust it using real pond observations.",
      },
      {
        question: "Is feed index the same as FCR?",
        answer: "No. Feed index plans a daily ration before feeding, while FCR compares feed already used with biomass already gained.",
      },
    ],
    sections: [
      {
        heading: "Quick answer",
        body: [
          "Feed index is a planning method used to estimate how much feed a shrimp pond should receive each day. It uses the shrimp's days of culture (DOC), population, and a chosen index linked to target average daily growth (ADG).",
          "The result is only a starting ration. Feed trays, sampling, survival, mortality, partial harvests, and water quality must still guide the final amount.",
        ],
      },
      {
        heading: "Feed index formula",
        body: [
          "A commonly used formula is: daily feed (kg) = DOC × shrimp population × (feed index ÷ 100) ÷ 1,000.",
          "For example, a pond at DOC 30 with 100,000 stocked shrimp and a feed index of 0.40 gives: 30 × 100,000 × 0.004 ÷ 1,000 = 12 kg/day.",
          "The starting feed allocation is therefore 12 kg per day, divided across the farm's feeding schedule.",
        ],
      },
      {
        heading: "How to choose the feed index",
        body: [
          "Some farms begin with an index around 1.5 to 2 times the target ADG. For example, a target ADG of 0.20 g/day may lead to a starting index between 0.30 and 0.40.",
          "This is a farm-planning convention, not a universal biological rule. The correct index depends on shrimp size, feed quality, stocking density, survival, pond conditions, feeding method, and past farm performance.",
        ],
      },
      {
        heading: "Feed index, feed rate, and FCR are different",
        body: [
          "Feed index looks forward. FCR looks backward. Neither number should be judged alone.",
        ],
        table: {
          columns: ["Measure", "Main purpose", "When it is used"],
          rows: [
            ["Feed index", "Plans daily feed from DOC, population, and target growth", "Before feeding"],
            ["Feed rate", "Calculates feed as a percentage of estimated biomass", "After reliable sampling"],
            ["FCR", "Compares feed used with biomass gained", "During review or after harvest"],
          ],
        },
      },
      {
        heading: "Why the calculation can become wrong",
        body: [
          "The formula may overestimate feed when it continues using the original stocking number after mortality or partial harvest. It may underestimate feed when growth is stronger than expected or when the selected index is too low.",
          "Sampling error can also distort the decision. A sample containing mostly large, active shrimp may overstate mean body weight and biomass.",
          "FAO guidance stresses that feeding plans should respond to shrimp size, estimated survival, water conditions, and observed feeding behaviour—not remain fixed throughout the cycle.",
        ],
      },
      {
        heading: "How to adjust the ration safely",
        body: [
          "Feed management must keep changing as shrimp grow and pond conditions move.",
        ],
        ordered: true,
        items: [
          "Check several feed trays: One empty or full tray is not enough to judge the whole pond.",
          "Review recent sampling: Compare MBW and ADG with the target used to choose the index.",
          "Correct the population estimate: Include recorded mortality and every partial harvest.",
          "Check water quality: Review dissolved oxygen, temperature, pH, ammonia, and nitrite before increasing feed.",
          "Make gradual changes: Avoid a large ration increase based on one good tray check.",
          "Confirm the result: Watch the next tray checks, water readings, mortality pattern, and sampling result.",
        ],
        note: "Do not automatically increase feed every day because the formula says so. A calculator cannot see weak appetite, molting, low oxygen, disease risk, or an incorrect survival estimate.",
      },
      {
        heading: "Warning signs that the feed index needs review",
        body: [
          "Possible over-allocation signs include feed remaining repeatedly across several trays, FCR rising while ADG stays flat, feed use increasing faster than biomass, weakening early-morning dissolved oxygen, or rising ammonia, nitrite, sludge, or organic waste.",
          "Possible under-allocation signs include trays clearing unusually quickly across repeated checks, ADG remaining below target without clear water-quality or health stress, poor feed distribution, or a higher actual population or biomass than the working estimate.",
          "These are warning signs, not proof. Check the full pond record before changing the ration.",
        ],
      },
      {
        heading: "Use Shrimply to review the feed index",
        body: [
          "Record actual feeding in Feed History. Use Sampling to compare MBW and ADG with the growth target. Record mortality and partial harvests so the population estimate stays realistic.",
          "Compare feeding changes with Water Quality trends, and reconcile feed use with Inventory before trusting FCR. Sampling records should track growth but must not deduct feed inventory; only actual feeding should reduce feed stock.",
          "For a biomass-percentage method rather than a DOC index curve, use the Vannamei Feeding Rate Chart & Calculator as a starting baseline.",
        ],
      },
      {
        heading: "When to get specialist help",
        body: [
          "Escalate when feed response remains weak, mortality continues, shrimp show abnormal behaviour, water conditions remain unstable, or growth falls despite reliable feed and sampling records. Do not diagnose disease from tray results or slow growth alone.",
        ],
      },
    ],
    checklist: [
      "Calculate the index ration from DOC, population, and the farm's chosen index.",
      "Treat the answer as a starting amount, not an automatic feeding instruction.",
      "Check several trays and review recent MBW, ADG, mortality, harvest, and water-quality records.",
      "Adjust the population estimate after reliable evidence of mortality or partial harvest.",
      "Change the ration gradually and confirm the response before changing it again.",
    ],
    sources: [sources.feedIndexStudy, sources.faoDailyFeedGuidance, sources.faoFeedManagement],
  },
  {
    slug: "vannamei-feeding-rate",
    section: "Feed and Inventory",
    label: "Feed Management",
    author: defaultResourceAuthor,
    reviewer: defaultNutritionReviewer,
    title: "Vannamei Feeding Rate Chart & Calculator: Daily Feed by Body Weight",
    description: "Estimate a baseline daily ration for Pacific white shrimp from standing biomass and average body weight, then adjust it using feed trays, recent sampling, harvests, and water quality.",
    readTime: "9 min read",
    tags: [
      "vannamei feeding rate",
      "vannamei feeding chart",
      "shrimp feeding table",
      "shrimp feed per day",
      "shrimp feeding rate by body weight",
      "shrimp feed percentage",
      "how much feed for vannamei",
      "feed calculation shrimp",
      "shrimp feed calculator",
      "feed tray shrimp",
    ],
    publishedAt: "2026-08-31",
    image: {
      src: "/resources/images/vannamei-feeding-rate-calculator-infographic.png",
      alt: "Vannamei feeding rate infographic showing how to estimate biomass, apply a feeding rate, divide the daily ration into meals, and verify the baseline with trays, sampling, and water quality",
      width: 1672,
      height: 941,
    },
    updatedAt: "2026-09-12",
    relatedFeature: { label: "Feed Management Software", href: "/shrimp-feed-management-software" },
    takeaways: [
      "The calculator uses Shrimply's shared grow-out curve from 1.65 g ABW; it is a baseline, not a prescription.",
      "Daily feed (kg) = standing biomass (kg) × feeding rate (%) ÷ 100.",
      "If biomass is estimated from stocking, subtract cumulative partial harvests after applying the survival estimate.",
      "Confirm every calculated ration with several trays, recent MBW and mortality records, water quality, and the feed manufacturer's label.",
    ],
    faqs: [
      {
        question: "What is the recommended feeding rate for Vannamei shrimp?",
        answer: "There is no single safe rate for every pond. Shrimply's calculator uses a grow-out baseline that falls from 6.5% of biomass per day at 1.65–3 g ABW to 2.1% above 33 g, but the final ration still depends on biomass accuracy, feed, natural food, temperature, dissolved oxygen, and observed feed response.",
      },
      {
        question: "How do you calculate daily feed for shrimp?",
        answer: "Multiply standing biomass by the feeding-rate percentage and divide by 100: Daily feed (kg) = biomass (kg) × rate (%) ÷ 100. A 3,000 kg biomass at a 3.3% baseline gives 99 kg/day before tray and water-quality adjustments.",
      },
      {
        question: "How many times per day should Vannamei shrimp be fed?",
        answer: "Commercial schedules commonly split feed into several meals, with frequency depending on shrimp size, feed stability, feeding method, labour, and pond conditions. Use the feed label and farm procedure as the starting schedule, then compare several trays and growth records before changing it.",
      },
      {
        question: "How much feed should be placed on shrimp feed trays (anco)?",
        answer: "The calculator defaults to 1.2% of each meal spread across all trays, but the control can be changed to match the farm procedure. Published commercial schedules use different tray percentages by shrimp size, so keep the method consistent and interpret the trend rather than treating one percentage as universal.",
      },
      {
        question: "How long should you wait before checking shrimp feed trays?",
        answer: "A practical starting window is about 2.5 hours for small juveniles, 1.5–2.0 hours through mid-grow-out, and 1.0–1.5 hours for larger shrimp. Match the timing to pellet water stability, shrimp size, feeding method, and the farm's established tray procedure.",
      },
      {
        question: "How does water temperature and dissolved oxygen affect shrimp feeding rates?",
        answer: "Both affect feeding, but the response changes with shrimp size and the speed of the water-quality change. If dissolved oxygen is below the farm target or falling, delay or reduce the meal, restore aeration, and recheck before feeding; do not rely on one universal percentage cut.",
      },
      {
        question: "Does Shrimply automatically calculate feed rates and biomass?",
        answer: "Shrimply calculates pond metrics from stocking, mortality, harvest, MBW, and feed records, and uses the same feeding-rate curve as this calculator. When enough records exist, it can show a feed-to-biomass mismatch for the team to investigate; it does not prove appetite or diagnose a cause.",
      },
    ],
    sections: [
      {
        heading: "Quick answer: calculate a baseline, then check the pond",
        body: [
          "Estimate standing biomass, apply the feeding-rate percentage for the latest valid average body weight (ABW), then divide the result into the farm's planned meals.",
          "The answer is only a starting ration. Biomass error, partial harvests, natural food, feed quality, temperature, dissolved oxygen, and shrimp health can all change the amount the pond can use.",
          "Check several trays and review recent sampling, mortality, harvest, and water-quality records before increasing or maintaining the calculated amount.",
        ],
      },
      {
        heading: "Baseline feeding-rate curve",
        body: [
          "These are the reference points in Shrimply's shared grow-out curve. The calculator uses linear interpolation between points so the rate changes smoothly as ABW rises.",
          "Published schedules differ because feed formulation, stocking density, natural productivity, water stability, and target FCR differ. Treat this curve as a consistent management baseline and compare it with the feed manufacturer's table and pond response.",
        ],
        table: {
          columns: [
            "ABW reference point",
            "Baseline rate (% biomass/day)",
          ],
          rows: [
            ["1.65–3.0 g", "6.5%"],
            ["5.0 g", "5.5%"],
            ["7.5 g", "4.2%"],
            ["10.5 g", "3.6%"],
            ["14.0 g", "3.3%"],
            ["17.5 g", "3.1%"],
            ["21.0 g", "2.9%"],
            ["25.0 g", "2.7%"],
            ["29.0 g", "2.5%"],
            ["33.0 g", "2.3%"],
            ["> 33.0 g", "2.1%"],
          ],
        },
        note: "Do not use this grow-out calculator below 1.65 g ABW. Nursery feeding commonly follows hatchery or feed-manufacturer schedules based on post-larvae count and culture stage.",
      },
      {
        heading: "Interactive Vannamei Shrimp Feed Calculator",
        body: [
          "Use the calculator for shrimp at or above 1.65 g ABW. Enter known standing biomass, or estimate it from initial stocking, survival, cumulative partial harvest count, and ABW.",
          "The tool uses the same linear interpolation curve as Shrimply's shared pond calculations. It then divides the baseline daily ration by your selected meal count and calculates the amount placed on each monitoring tray.",
        ],
        note: "A calculated ration is not a ceiling or a command. If trays, water quality, weather, behaviour, or recent growth disagree with the number, follow the farm's safe feeding procedure and investigate before the next meal.",
      },
      {
        heading: "How to calculate daily feed for shrimp: The biomass formula",
        body: [
          "To calculate a baseline daily allocation, use current standing biomass and the feeding-rate percentage for the latest valid ABW.",
          "The primary calculation formula is: Daily Feed (kg) = Standing Biomass (kg) × [Feeding Rate (%) ÷ 100]",
          "If biomass is unknown: Current Population = (Initial Stock × Survival %) − Cumulative Partial Harvest Count. Standing Biomass (kg) = Current Population × ABW (g) ÷ 1,000.",
          "Worked example 1: At 12.0 g ABW, the shared curve interpolates a 3.47% baseline. A 3,500 kg standing biomass gives 3,500 × 0.0347 = 121.5 kg/day, or about 30.4 kg per meal across four meals.",
          "Worked example 2: From 200,000 stocked shrimp at 80% survival with 20,000 already harvested, current population is 140,000. At 8.0 g ABW, biomass is 1,120 kg and the interpolated rate is 4.10%, giving 45.9 kg/day before pond-response adjustments.",
        ],
      },
      {
        heading: "Feed tray management: keep the method consistent",
        body: [
          "Feed trays (also called check trays, lift nets, or anco) help the team compare feed response over time. They do not measure the appetite of every shrimp in the pond.",
          "Published commercial schedules use different tray percentages and check times by shrimp size. The calculator defaults to 1.2% of each meal across all selected trays; change it to match the farm's written procedure and keep placement, timing, and tray loading consistent.",
          "Use several representative trays. Avoid placing every tray in one current pattern, a stagnant corner, or heavy sludge, because location can distort the result.",
        ],
        items: [
          "All trays clean once: Record the result, but do not increase feed from one observation alone. Confirm the pattern, recent growth, and water quality.",
          "More than 10% remains on several trays: Reduce the next ration according to the farm procedure and check dissolved oxygen, temperature, pH trend, weather, and shrimp behaviour.",
          "Trays disagree: Check feed distribution, tray position, current, sludge, and whether every tray was loaded and lifted at the same time.",
          "Feed response stays weak or mortality rises: Hold further increases and seek technical or aquatic-animal-health support; tray results alone cannot diagnose disease.",
        ],
      },
      {
        heading: "Water and weather checks before feeding",
        body: [
          "Dissolved oxygen: Check the current reading and recent trend before feeding, especially around pre-dawn and after unstable weather. If DO is below the farm target or still falling, prioritise aeration, delay or reduce the meal, and recheck before resuming.",
          "Temperature: Feeding response changes with temperature and shrimp size. Research shows that the temperature for fastest growth is size-specific, so a single temperature multiplier is not reliable for every pond.",
          "Rain, plankton change, pH movement, and salinity change: Compare conditions with the pond's normal range and recent tray response. Use smaller, reversible feed changes and confirm the next observation rather than applying an automatic fixed cut.",
          "Natural food and feed quality: Pond productivity, pellet stability, palatability, and nutrient density can change compound-feed intake. Follow the feed label and investigate storage or feed-quality problems when tray response changes suddenly.",
        ],
      },
      {
        heading: "How Shrimply automates feeding rate and biomass tracking",
        body: [
          "Shrimply combines initial stocking, recorded mortality, cumulative harvests, and the latest valid MBW to estimate current population and biomass. Missing or outdated records still make the estimate less reliable, so the app does not remove the need for field checks.",
          "The feeding-rate curve in this page is shared with Shrimply's pond calculations. When enough suitable records exist, the pond view can compare feed-based biomass with recorded biomass and flag a repeated mismatch for investigation.",
          "Actual feeding records can deduct feed inventory. Sampling records store biological observations such as MBW and feed context but do not deduct inventory, preventing a sample from being counted as a warehouse movement.",
        ],
      },
      {
        heading: "Warning signs of feeding allocation errors",
        body: [
          "Treat these as observations that require checking, not as proof of one cause:",
        ],
        items: [
          "Possible over-allocation: Repeated feed left on several trays, worsening FCR, rising feed-to-biomass mismatch, deteriorating bottom condition, or a downward pre-dawn DO trend.",
          "Possible under-allocation: Repeatedly clean trays together with weak growth, aggressive edge feeding, or a daily ration consistently below the biomass baseline.",
          "Possible distribution problem: Tray results differ sharply by location or size variation widens. Check broadcast coverage, current, tray placement, sampling method, and population estimates before blaming feed amount alone.",
          "Possible data problem: A sudden improvement or decline appears after missing mortality, harvest, feed, or MBW records. Correct the records before making a large ration change.",
        ],
      },
      {
        heading: "When to stop and get specialist help",
        body: [
          "Escalate when mortality continues, shrimp show abnormal swimming or appearance, feed response remains weak across several meals, water quality cannot be stabilised, or the pond does not improve after cautious corrections. Feed trays and calculator results cannot confirm an infectious disease.",
        ],
      },
    ],
    checklist: [
      "Use the latest valid MBW and a population estimate that includes mortality and cumulative harvests.",
      "Calculate the baseline ration and divide it using the farm's meal schedule.",
      "Load, place, and check several trays with the same method each time.",
      "Review dissolved oxygen, temperature, pH trend, weather, and shrimp behaviour before increasing feed.",
      "Make small, reversible changes and confirm the next tray and growth response.",
      "Record actual feeding separately from biological sampling so inventory and FCR remain trustworthy.",
    ],
    sources: [
      sources.taylorFrancisFeeding,
      sources.faoVannameiFeedingSchedule,
      sources.faoFeedManagement,
      sources.vannameiTemperatureFeedingStudy,
      sources.faoVannamei,
    ],
  },
  {
    slug: "feed-inventory-control",
    section: "Feed and Inventory",
    label: "Feed and Inventory",
    author: defaultResourceAuthor,
    reviewer: defaultNutritionReviewer,
    title: "Feed Inventory Control for Shrimp Farms: Avoid Stockouts, Waste, and Bad FCR",
    description: "Learn how shrimp farms can manage feed stock, feed batches, reorder timing, and pond-level feed use to protect growth and cost control.",
    readTime: "6 min read",
    tags: ["feed inventory", "stockout", "reorder", "feed batch", "feed cost"],
    publishedAt: "2026-06-08",
    image: {
      src: "/resources/images/shrimp-feed-inventory-control-farm-software.jpg",
      alt: "Shrimp farm feed inventory control board showing stock on hand, feed issued by pond, weekly stock count, feed batches, and storage records",
      width: 1672,
      height: 941,
    },
    updatedAt: "2026-09-12",
    relatedFeature: { label: "Feed Management Software", href: "/shrimp-feed-management-software" },
    takeaways: [
      "Feed inventory is both a cost-control and production-control system.",
      "Stockouts can disrupt feeding rhythm, while overstocking can create storage and quality risk.",
      "Batch and movement records help farms explain poor feed response.",
    ],
    sections: [
      {
        heading: "Why feed inventory is operational, not just accounting",
        body: [
          "Feed is often one of the largest variable costs in shrimp production. If the farm does not know what feed is in stock, what was issued, and which pond used it, managers cannot trust FCR or cost reports.",
          "FAO guidance on feed records emphasizes identifying feeds and keeping records of arrival and use. For shrimp farms, this protects both production decisions and financial reporting.",
        ],
      },
      {
        heading: "What to track",
        body: [
          "At minimum, farms should track feed product, bag count or weight, purchase date, supplier, batch if available, storage location, issue date, pond, and user. A weekly stock count helps catch missing movement before the farm discovers the problem at feeding time.",
          "Storage conditions matter too. Feed exposed to moisture, heat, pests, or poor rotation can damage performance even if the feeding schedule looks correct.",
        ],
      },
      {
        heading: "How inventory supports better feeding",
        body: [
          "Inventory records help managers compare planned feed use against actual feed issued. When paired with sampling and harvest data, this shows whether feed strategy is supporting growth or creating waste.",
        ],
      },
    ],
    checklist: [
      "Record feed arrivals, products, quantities, and suppliers.",
      "Deduct stock only when feed is actually used or issued.",
      "Connect feed use to pond and cycle records.",
      "Review reorder timing before high-consumption weeks.",
    ],
    sources: [sources.faoFeedRecords, sources.faoFeedManagement, sources.profitabilityReview],
  },
  {
    slug: "feed-tray-observations",
    section: "Feed and Inventory",
    label: "Feed and Inventory",
    author: defaultResourceAuthor,
    reviewer: defaultNutritionReviewer,
    title: "Feed Tray Observations: Reading Shrimp Appetite Before Feed Becomes Waste",
    description: "A practical guide to feed tray observations for shrimp farmers, including appetite checks, feeding adjustment, waste reduction, and water-quality risk.",
    readTime: "6 min read",
    tags: ["feed tray", "appetite", "anco", "feed response", "water quality"],
    publishedAt: "2026-06-08",
    image: {
      src: "/resources/images/shrimp-feed-tray-observation-vannamei-pond.png",
      alt: "Shrimp farmer checking a feed tray in a vannamei shrimp pond to monitor appetite and feed consumption",
      width: 1448,
      height: 1086,
    },
    updatedAt: "2026-09-12",
    relatedFeature: { label: "Feed Management Software", href: "/shrimp-feed-management-software" },
    takeaways: [
      "Feed trays help farms observe appetite instead of guessing.",
      "Tray results should be connected to water quality, weather, molting, and disease signals.",
      "Consistent tray records can reduce waste and improve feed decisions.",
    ],
    faqs: [
      {
        question: "How much should I feed shrimp each day?",
        answer: "Use the farm feeding plan as a starting point, then adjust gradually using estimated biomass, shrimp size, feed-tray observations, recent sampling, water quality, weather, and mortality. Do not increase feed from appetite alone without checking whether growth and pond conditions support it.",
      },
      {
        question: "What does leftover feed in a shrimp feed tray mean?",
        answer: "Leftover feed can indicate overfeeding or reduced appetite from low oxygen, water-quality stress, molting, disease risk, or weather. Confirm the pattern across trays and recent pond records before making a major feeding change.",
      },
    ],
    sections: [
      {
        heading: "What feed trays are trying to tell you",
        body: [
          "Feed trays are simple tools for checking whether shrimp are consuming feed as expected. They are not perfect biomass calculators, but they give technicians a direct appetite signal that can guide feeding adjustments.",
          "FAO aquaculture methods describe feeding trays as tools used to supply feed and monitor feed consumption and growth. In shrimp farms, that observation is valuable because uneaten feed can quickly become a water-quality and cost problem.",
        ],
      },
      {
        heading: "How to interpret tray results",
        body: [
          "A clean tray may suggest strong appetite, but the farm should still compare it with growth and water quality. A tray with leftover feed may indicate overfeeding, low appetite, stress, poor DO, disease risk, molting, or weather-related behavior.",
          "The best practice is to track tray observations consistently by pond and time, then review them alongside feed amount, DO, pH, temperature, and mortality.",
        ],
      },
      {
        heading: "Avoid overreacting to one tray",
        body: [
          "One tray result should not drive the whole feeding strategy. Look for patterns across multiple trays, recent water-quality movement, and recent sampling. This protects the farm from cutting feed too aggressively or continuing waste for too long.",
          "To establish your pond's target baseline ration before reading check trays, consult our practical Vannamei Feeding Rate Chart & Calculator, which calculates biomass-based quotas by average body weight.",
        ],
      },
    ],
    checklist: [
      "Record tray checks at consistent times.",
      "Average multiple tray observations before judging appetite.",
      "Compare leftover feed with DO, pH, temperature, and mortality.",
      "Use tray patterns to adjust feeding gradually.",
    ],
    sources: [sources.faoFeedManagement, sources.faoFeedRecords, sources.noaaNutrients],
  },
  {
    slug: "water-quality-trends",
    section: "Water, Health, and Risk",
    label: "Water Quality",
    author: defaultResourceAuthor,
    reviewer: defaultTechnicalReviewer,
    title: "Shrimp Pond Water Quality Trends: Reading DO, pH, Salinity, Ammonia, and Nitrite Together",
    description: "Which shrimp pond water parameters should you test? Learn how to review dissolved oxygen, pH, temperature, salinity, ammonia, and nitrite together before they become a pond-risk pattern.",
    readTime: "7 min read",
    tags: ["shrimp water quality", "shrimp pond water parameters", "dissolved oxygen", "DO", "pH", "ammonia", "nitrite", "salinity"],
    publishedAt: "2026-06-08",
    image: {
      src: "/resources/images/shrimp-pond-water-quality-trends-monitoring.jpg",
      alt: "Shrimp pond water quality trends infographic comparing dissolved oxygen, pH, temperature, salinity, ammonia, and nitrite readings over time",
      width: 1672,
      height: 941,
    },
    updatedAt: "2026-09-12",
    relatedFeature: { label: "Water Quality Software", href: "/shrimp-water-quality-monitoring-software" },
    takeaways: [
      "Water quality should be interpreted as a trend, not isolated readings.",
      "Ammonia, nitrite, DO, pH, temperature, and salinity interact with shrimp stress.",
      "Feed waste and organic load can worsen water-quality risk.",
    ],
    faqs: [
      {
        question: "What water parameters should I test in a shrimp pond?",
        answer: "At minimum, consistently track the farm's operational parameters for dissolved oxygen, pH, temperature, salinity, ammonia, and nitrite, with the time of each reading. The right monitoring plan also depends on the farm system, season, stocking density, and local technical guidance.",
      },
      {
        question: "What should I check when dissolved oxygen drops in a shrimp pond?",
        answer: "Confirm the reading and timing, check aeration and shrimp behaviour, review recent feeding and organic load, compare pH and temperature movement, and inspect ammonia and nitrite where available. Escalate through the farm's oxygen-response procedure rather than assuming one measurement explains the cause.",
      },
      {
        question: "Why should ammonia, pH, and temperature be reviewed together?",
        answer: "These conditions interact: pH and temperature affect the proportion of ammonia present in the more toxic un-ionised form. A trend-based review is more useful than treating any one measurement as a complete diagnosis.",
      },
    ],
    sections: [
      {
        heading: "Why trends matter more than single readings",
        body: [
          "A single water-quality reading can be useful, but trend movement is usually more valuable for farm decisions. Dissolved oxygen, pH, temperature, salinity, ammonia, and nitrite can shift across the day and across the crop.",
          "Open research on shrimp wastewater and water quality highlights nitrogen compounds and organic load as important concerns in shrimp systems. For farmers, the practical lesson is to track movement before it becomes a crisis.",
        ],
      },
      {
        heading: "Connect water quality to feed and behavior",
        body: [
          "Uneaten feed and waste add organic load. That can affect oxygen demand, nutrient levels, and pond stability. NOAA guidance on aquaculture nutrient impacts also points to uneaten feed and waste as key nutrient sources in farm environments.",
          "When appetite drops, farmers should check water before assuming shrimp simply need less feed. Poor water can reduce appetite, and overfeeding into poor appetite can make the water worse.",
        ],
      },
      {
        heading: "What to review daily",
        body: [
          "At minimum, track the farm's key operational parameters consistently and record time of measurement. Compare today with the previous several readings, not just the target range. Sudden movement deserves attention even if the number has not crossed an alarm threshold.",
          "For practical grow-out reference ranges and the pond context that changes risk, use the [Vannamei Water Quality Parameters guide](/resources/vannamei-water-quality-parameters).",
        ],
      },
    ],
    checklist: [
      "Record reading time with every water-quality entry.",
      "Review the last several readings before deciding action.",
      "Compare water movement with feed response and mortality.",
      "Flag sudden changes even before readings become extreme.",
    ],
    sources: [sources.wastewaterReview, sources.noaaNutrients, sources.probioticsReview],
  },
  {
    slug: "shrimp-disease-alerts",
    section: "Water, Health, and Risk",
    label: "Disease Risk",
    author: defaultResourceAuthor,
    reviewer: defaultTechnicalReviewer,
    title: "Shrimp Disease Alerts: Turning Farm Observations Into Faster Response",
    description: "What are the early signs of shrimp disease? Use mortality, appetite, water quality, behaviour, and biosecurity observations to create a faster, evidence-based farm response.",
    readTime: "7 min read",
    tags: ["shrimp disease signs", "shrimp disease prevention", "disease alerts", "Vibrio", "AHPND", "EHP", "WSSV", "mortality", "biosecurity"],
    publishedAt: "2026-06-08",
    image: {
      src: "/resources/images/shrimp-disease-alerts-vibrio-ahpnd-biosecurity.jpg",
      alt: "Shrimp disease alerts infographic showing appetite, mortality, water quality, behavior, Vibrio, AHPND, biosecurity, and farm response signals",
      width: 1536,
      height: 1024,
    },
    relatedFeature: { label: "Education Hub", href: "/resources" },
    takeaways: [
      "Disease response improves when farms track early warning signals consistently.",
      "Alerts should combine mortality, appetite, behavior, water quality, and regional risk.",
      "Biosecurity and better management practices reduce preventable losses.",
    ],
    faqs: [
      {
        question: "What are the early signs of disease in shrimp?",
        answer: "Watch for appetite changes, unusual swimming, colour change, soft shell, rising mortality, water-quality instability, and unusual feed-tray observations. These signals do not confirm a disease by themselves, but they warrant a rapid pond review and appropriate diagnostic support.",
      },
      {
        question: "How can shrimp farmers prevent disease outbreaks?",
        answer: "Prevention combines biosecurity, quality post-larvae, controlled water and equipment movement, consistent water-quality and appetite records, early mortality review, and diagnostic escalation. A farm should follow local regulations and veterinary guidance for any treatment decisions.",
      },
    ],
    sections: [
      {
        heading: "What disease alerts should include",
        body: [
          "A disease alert should not wait for a single dramatic event. Shrimp farms should watch appetite changes, unusual swimming, color change, soft shell, rising mortality, water-quality instability, and nearby outbreak information.",
          "WorldFish disease-risk material emphasizes better detection, management, and prevention. FAO vannamei material also describes disease signs and prevention measures for major shrimp disease risks.",
        ],
      },
      {
        heading: "Why alerts need farm context",
        body: [
          "A mortality number means more when it is connected to pond, DOC, water quality, recent feed response, sampling history, and treatments. Without context, teams may underreact to a serious pattern or overreact to a normal operational event.",
          "Digital alerts are most useful when they make the team review evidence quickly, not when they pretend to diagnose disease automatically.",
        ],
      },
      {
        heading: "Biosecurity is part of the alert system",
        body: [
          "Disease alerts should connect to action: isolate equipment, check water exchange, review movement between ponds, inspect feed response, and contact the right technical support. Good alert design turns observations into a repeatable response routine.",
        ],
      },
    ],
    checklist: [
      "Track appetite, mortality, behavior, and water quality by pond.",
      "Define alert thresholds and review rules before the cycle starts.",
      "Record actions taken after each alert.",
      "Keep biosecurity steps tied to the alert workflow.",
    ],
    sources: [sources.worldfishDisease, sources.faoVannamei, sources.seafdecBmp],
  },
  {
    slug: "shrimp-mortality-tracking",
    section: "Water, Health, and Risk",
    label: "Disease Risk",
    author: defaultResourceAuthor,
    reviewer: defaultTechnicalReviewer,
    title: "Shrimp Mortality Tracking: How Loss Records Protect Biomass, FCR, and Harvest Planning",
    description: "Why are shrimp dying in my pond? Learn how mortality records help farmers investigate sudden loss, protect biomass estimates, improve FCR accuracy, and trigger a timely disease-risk response.",
    readTime: "6 min read",
    tags: ["shrimp mortality", "shrimp dying", "sudden mortality", "survival", "disease risk", "biomass", "AHPND"],
    publishedAt: "2026-06-08",
    image: {
      src: "/resources/images/shrimp-mortality-tracking-survival-biomass.jpg",
      alt: "Shrimp mortality tracking infographic for recording pond losses, survival, biomass, FCR risk, disease response, and harvest planning",
      width: 1672,
      height: 941,
    },
    relatedFeature: { label: "Education Hub", href: "/resources" },
    takeaways: [
      "Mortality affects population, biomass, FCR, and harvest expectations.",
      "Daily mortality trends are more useful than occasional totals.",
      "Mortality records should trigger review of water, disease, and feed response.",
    ],
    faqs: [
      {
        question: "Why are shrimp dying in my pond?",
        answer: "Mortality can be associated with water-quality stress, disease, feed response, handling, predators, and other operational conditions. Record the timing, pond area, shrimp condition, appetite, water readings, and recent changes, then follow the farm's biosecurity and diagnostic escalation process.",
      },
      {
        question: "How does shrimp mortality affect FCR and harvest planning?",
        answer: "Unrecorded losses overstate population and biomass, which can lead to overfeeding, misleading FCR, and unrealistic harvest expectations. Update population and biomass assumptions when a mortality pattern is confirmed.",
      },
    ],
    sections: [
      {
        heading: "Why mortality records are not optional",
        body: [
          "Mortality directly changes the estimated population in a pond. If losses are missed, biomass can be overstated, feed can be overissued, and FCR can look worse or better than reality.",
          "Mortality is also an early warning signal. A small daily increase may matter more than a single isolated count if it continues across several days.",
        ],
      },
      {
        heading: "How to record mortality usefully",
        body: [
          "Record date, pond, count or estimated weight, condition, location, and any linked observation such as low appetite, poor DO, unusual color, or recent treatment. If mortality is estimated, mark it as estimated.",
          "The value is not only the number. The value is the connection between mortality, water quality, feeding, and disease-risk observations.",
        ],
      },
      {
        heading: "Use mortality to update decisions",
        body: [
          "After mortality is recorded, update population and biomass assumptions. Then review feeding and harvest plans. If the mortality pattern is abnormal, follow the farm's biosecurity and escalation process.",
        ],
      },
    ],
    checklist: [
      "Record mortality daily by pond.",
      "Separate confirmed counts from estimates.",
      "Update population and biomass assumptions.",
      "Review mortality trends with water quality and appetite.",
    ],
    sources: [sources.faoVannamei, sources.worldfishDisease, sources.faoRecords],
  },
  {
    slug: "white-feces-disease-shrimp",
    section: "Water, Health, and Risk",
    label: "Disease Risk",
    author: defaultResourceAuthor,
    reviewer: defaultTechnicalReviewer,
    title: "White Feces Disease in Shrimp (WFD): Causes, Response, and Prevention",
    description: "A deep dive into shrimp white feces disease, WFD, or white feces syndrome, including signs, pond parameters, EHP and Vibrio risk, treatment response, Bacillus probiotics, and prevention.",
    readTime: "9 min read",
    tags: ["white feces disease", "WFD", "WFS", "EHP", "Vibrio", "Bacillus", "probiotics"],
    publishedAt: "2026-06-12",
    image: {
      src: "/resources/images/white-feces-disease-wfd-shrimp-guide.png",
      alt: "White feces disease WFD shrimp farming guide showing symptoms, EHP and Vibrio risk factors, pond water parameters, immediate response, and prevention steps",
      width: 1672,
      height: 941,
    },
    relatedFeature: { label: "Disease Alerts", href: "/features/disease-alerts" },
    takeaways: [
      "White feces disease is better treated as a multifactorial gut-health and pond-stability problem, not a single-pathogen event.",
      "High organic load, feed waste, unstable pH or alkalinity, low dissolved oxygen, ammonia or nutrient buildup, EHP, Vibrio, and gut dysbiosis can work together.",
      "Long-term prevention depends on clean pond preparation, strong seed screening, stable water quality, careful feeding, biosecurity, and routine use of proven probiotics or feed additives.",
    ],
    sections: [
      {
        heading: "What WFD actually is",
        body: [
          "White feces disease, often called white feces syndrome, is recognized on farms when white fecal strings float on the pond surface or appear in feed trays. Affected shrimp may show a pale or empty gut, yellow-white intestinal tract, weak appetite, slow growth, size variation, soft shell, chronic mortality, and poor FCR.",
          "The important point for farm teams is that WFD is a syndrome, not a simple diagnosis from one visual sign. Research reviews describe it as multifactorial. Different studies connect WFD or WFS with EHP, Vibrio species, gut microbiome imbalance, damaged hepatopancreas tissue, pond bacterial shifts, and deteriorating water quality.",
          "That means a farm response should not stop at naming the disease. The manager needs to ask: what changed in appetite, feed waste, water quality, organic load, pond bottom condition, Vibrio pressure, EHP risk, and recent biosecurity?",
        ],
      },
      {
        heading: "Why one cause is rarely enough",
        body: [
          "A PLOS ONE infection study reproduced WFS in whiteleg shrimp when shrimp were pre-infected with EHP and then challenged with a particular Vibrio parahaemolyticus isolate. The authors concluded that the result showed a synergistic relationship between EHP and the Vibrio isolate.",
          "That finding is useful for farms because it explains why some ponds with EHP do not always show WFD, and why some Vibrio counts alone do not predict the whole problem. The disease expression can depend on the condition of the shrimp gut, hepatopancreas, pond environment, and microbial community at the same time.",
          "More recent probiotic research also supports the co-infection and microbiome view. A 2024 npj Biofilms and Microbiomes paper validated a three-Vibrio pathogen cocktail in WFS etiology and tested a designed probiotic mix including Bacillus subtilis as part of the prevention strategy.",
        ],
      },
      {
        heading: "Parameters and pond conditions that raise WFD risk",
        body: [
          "Farmers should watch WFD risk through the pond trend, not only a single water test. Research on bacterial communities during WFD outbreaks found disease events coincided with sudden water-parameter changes, pond bacterial shifts, and appetite decline two to three days before visible disease.",
          "The most important parameters to review are dissolved oxygen, pH, alkalinity, temperature, salinity, ammonia, nitrite, phosphate, turbidity, suspended solids, organic matter, feed tray leftovers, and Vibrio pressure. In the same Scientific Reports study, healthy and diseased pond separation was influenced by presumptive pathogenic Vibrio, ammonium, phosphate, pH, temperature, and turbidity, while nitrite, nitrate, reactive silicate, and salinity also contributed to pond differences.",
          "Low oxygen and weak buffering make the situation worse. The paper also notes earlier reports where dissolved oxygen below 3.0 mg/L and alkalinity below 80 ppm were associated with peak mortality during WFD outbreaks. For practical management, farms should not wait until DO is critically low; appetite drops, cloudy water, rising organic load, or unstable pH should trigger review earlier.",
        ],
      },
      {
        heading: "Immediate response when white feces appear",
        body: [
          "First, confirm the pattern. Check multiple pond areas and feed trays, sample shrimp for gut condition, compare appetite against the previous three to five days, and record mortality. If diagnostic support is available, test for EHP and relevant Vibrio instead of relying on visual signs only.",
          "Second, reduce the pond stress load. Adjust feeding based on tray response, remove excess organic material where the farm system allows it, strengthen aeration, stabilize alkalinity and pH carefully, and review ammonia and nitrite. Avoid aggressive chemical action that shocks shrimp or collapses the pond microbial balance.",
          "Third, isolate the risk operationally. Keep equipment, nets, siphon tools, boots, and personnel movement controlled between affected and unaffected ponds. WFD material and fecal strings can carry microbial risk, so pond-to-pond transfer through tools or water handling should be treated seriously.",
        ],
      },
      {
        heading: "Treatment support: what is realistic",
        body: [
          "There is no responsible one-step cure for WFD that should be promised across all farms. A realistic treatment response supports the shrimp gut, lowers pathogen pressure, improves water stability, and removes the management conditions that allowed the outbreak to expand.",
          "A practical support program may include feed reduction during weak appetite, gut-support feed additives, vitamin or immunostimulant support where already approved by the farm veterinarian or technical advisor, water-quality correction, pond-bottom management, and probiotic use. The exact product, dose, and timing should follow local regulation, label instructions, and professional diagnosis.",
          "Antibiotics should not be used casually. WFD is not always a simple bacterial infection, and antibiotic misuse can damage farm credibility, residue compliance, pond microbiota, and future disease control. If antibiotics are considered, that decision should come from diagnostic evidence and local veterinary guidance.",
        ],
      },
      {
        heading: "Bacillus and probiotic prevention",
        body: [
          "Bacillus-based probiotics are useful because they can support pond microbial stability and organic matter processing, and some strains can directly antagonize pathogens. The important word is strain. A product should be selected for evidence, viability, storage quality, and farm fit, not just because the label says probiotic.",
          "A 2024 designed-probiotic WFS study used a mix that included Bacillus subtilis along with Ruegeria, Nioella, and Streptomyces strains. The authors reported protection through gut microbiome stability, pathogen antagonism, and shrimp immune pathway activation. This does not mean every Bacillus product will prevent WFD, but it supports the long-term strategy of building a more resilient gut and pond microbiome.",
          "Separate pond-water probiotic work in Pacific white shrimp ponds found that probiotic water additives reduced ammonia and total Vibrio counts while improving dissolved oxygen under minimum-water-exchange conditions. That aligns with the farm logic: probiotics work best as part of a prevention program before the pond becomes overloaded, not as a last-minute rescue after appetite has already crashed.",
        ],
      },
      {
        heading: "Long-term prevention plan",
        body: [
          "Prevention starts before stocking. Use clean pond preparation, remove sludge, dry and disinfect where appropriate, screen post-larvae for major pathogens including EHP when available, and avoid stocking seed with weak gut condition or unknown health status.",
          "During culture, keep feeding disciplined. Use feed trays, avoid pushing feed when appetite drops, record feed by pond, and compare feed response with DO, pH, ammonia, nitrite, and weather. Overfeeding is one of the fastest ways to create the organic load that favors microbial instability.",
          "Build a routine WFD risk review. At least weekly, review appetite, white feces observations, gut color, soft shell, mortality, growth, FCR movement, DO, pH, alkalinity, ammonia, nitrite, salinity, turbidity, and recent probiotic or additive use. The goal is early correction while shrimp are still eating, not a late response after growth has stalled.",
        ],
      },
      {
        heading: "How Shrimply records help",
        body: [
          "WFD is exactly the kind of problem that becomes clearer when pond records are connected. Feed logs show whether appetite dropped before white feces appeared. Water-quality trends show whether pH, DO, ammonia, nitrite, or turbidity shifted. Sampling shows whether MBW and ADG slowed. Mortality logs show whether the issue is chronic or acute.",
          "For Orson AI and disease alerts, the strongest input is not one note that says WFD. The useful input is the last several water-quality records, sampling results, feed tray observations, mortality entries, feed changes, and treatments. That gives the farm a better chance of separating a gut-health problem from a water-quality problem, a feed-management problem, or a biosecurity failure.",
        ],
      },
    ],
    checklist: [
      "Check white fecal strings, pale gut, appetite drop, soft shell, mortality, MBW slowdown, and FCR movement together.",
      "Review DO, pH, alkalinity, ammonia, nitrite, phosphate, turbidity, salinity, temperature, organic load, and feed tray leftovers.",
      "Test for EHP and relevant Vibrio where diagnostic support is available.",
      "Reduce feed during weak appetite and correct water quality gradually.",
      "Strengthen aeration, pond-bottom management, and equipment biosecurity.",
      "Use Bacillus or multi-strain probiotics as a planned prevention tool, not only as a crisis response.",
      "Record every action so the next pond review can compare response against appetite, water quality, growth, and mortality.",
    ],
    sources: [
      sources.wfsMultifactorialReview,
      sources.wfsExperimentalReproduction,
      sources.wfdBacterialCommunities,
      sources.wfsDesignedProbiotics,
      sources.probioticAmmoniaShrimpPonds,
      sources.probioticsReview,
    ],
  },
  {
    slug: "ehp-shrimp-disease",
    section: "Water, Health, and Risk",
    label: "Disease Risk",
    author: defaultResourceAuthor,
    reviewer: defaultTechnicalReviewer,
    title: "EHP in Shrimp Farming: Why Growth Slows and How Farms Prevent Recurrence",
    description: "A practical guide to EHP management in vannamei shrimp, including Enterocytozoon hepatopenaei signs, PCR confirmation, pond risk parameters, treatment reality, Bacillus support, and long-term prevention.",
    readTime: "9 min read",
    tags: ["EHP", "Enterocytozoon hepatopenaei", "PCR", "hepatopancreas", "growth retardation", "Bacillus", "biosecurity"],
    publishedAt: "2026-06-13",
    updatedAt: "2026-07-09",
    image: {
      src: "/resources/images/ehp-shrimp-disease-guide.png",
      alt: "EHP shrimp farming guide showing growth lag, PCR confirmation, pond spore control, risk factors, immediate response, and long-term biosecurity prevention",
      width: 1672,
      height: 941,
    },
    relatedFeature: { label: "Disease Alerts", href: "/features/disease-alerts" },
    takeaways: [
      "EHP is a microsporidian parasite of the hepatopancreas that usually causes chronic growth loss, uneven size, poor FCR, and weaker harvest value rather than sudden mass mortality.",
      "Visual signs are not enough. Suspected EHP should be confirmed with PCR, histology, or qualified lab testing while the farm reviews MBW, ADG, FCR, feed response, and pond history.",
      "There is no reliable in-pond cure once EHP is established, so prevention depends on screened PL, pond-bottom hygiene, sludge control, clean water movement, dedicated tools, and strict biosecurity.",
    ],
    sections: [
      {
        heading: "What EHP actually is",
        body: [
          "EHP stands for Enterocytozoon hepatopenaei. It is a spore-forming microsporidian parasite that infects the shrimp hepatopancreas, the organ responsible for digestion, nutrient absorption, and much of the animal's production performance.",
          "The practical farm impact is often slow and expensive. EHP may not cause obvious mass mortality, but infected ponds can show retarded growth, uneven shrimp sizes, poor feed conversion, weak harvest value, and a cycle that becomes harder to predict.",
          "EHP should also be separated from a simple water-quality problem. Poor water does not create EHP from nothing, but stress, organic load, and weak pond-bottom condition can make an infected pond perform worse and can hide the real cause if growth records are not reviewed carefully.",
        ],
      },
      {
        heading: "What farmers usually see",
        body: [
          "The most common warning sign is a pond that stops gaining weight as expected. MBW may move slowly, ADG may flatten, feed response may weaken, and size variation can become more obvious at sampling or harvest.",
          "Some ponds show pale or empty gut, soft shell, poor appetite, or white fecal strings, but these signs are not consistent enough to diagnose EHP by sight. The WOAH disease card notes that external signs are often absent except for growth retardation over time, while white feces can appear in some cases and not others.",
          "That is why the farm should treat EHP suspicion as a trend problem. A single observation is weak. A pattern across MBW, ADG, FCR, appetite, pond history, and lab results is much stronger.",
        ],
      },
      {
        heading: "How EHP spreads",
        body: [
          "EHP spreads through spores and horizontal transmission. Research and disease guidance describe spread through cohabitation, cannibalism, infected shrimp populations, contaminated pond environments, and potentially risky live or fresh feeds used in broodstock systems.",
          "For grow-out farms, the highest practical risks are infected PL, ponds with previous EHP history, sludge and sediment that are not handled properly, shared nets or siphon tools, uncontrolled water movement, and weak separation between affected and unaffected ponds.",
          "Because spores can persist in the farm environment, prevention has to include both animal movement and pond-bottom management. It is not enough to only change feed additives if infected material, sludge, tools, or water are still moving risk between ponds.",
        ],
      },
      {
        heading: "Parameters and records that expose EHP risk",
        body: [
          "EHP is best detected in farm records by comparing growth expectation against reality. Review MBW, ADG, size variation, FCR, feed tray response, survival, stocking source, PL batch, pond history, and previous disease notes.",
          "Water-quality parameters still matter, but mainly because they explain stress and pond stability. Dissolved oxygen, pH, alkalinity, salinity, temperature, ammonia, nitrite, turbidity, and organic load should be reviewed alongside growth records, not used as a replacement for diagnosis.",
          "A pond with stable water but poor growth may still have EHP. A pond with EHP plus unstable water, heavy sludge, or weak appetite can lose performance faster. The decision should come from the whole pond picture.",
        ],
      },
      {
        heading: "Diagnosis and immediate response",
        body: [
          "Confirm EHP with diagnostic testing where available. Molecular methods such as PCR, nested PCR, qPCR, LAMP, and related assays are used for confirmation, while histology or in situ hybridization may show infection in hepatopancreatic tissue.",
          "While waiting for results, control spread. Stop unnecessary movement of shrimp, water, sludge, nets, boots, trays, and tools from suspect ponds to clean ponds. Keep sampling tools pond-specific where possible and record who entered which pond.",
          "Operationally, the farm should review the harvest plan, feeding plan, pond-bottom condition, and recent sampling trend. The goal is to contain the risk, protect unaffected ponds, and avoid wasting feed on a biomass projection that is no longer realistic.",
        ],
      },
      {
        heading: "Treatment reality",
        body: [
          "EHP should not be sold to farmers as a disease with a simple pond-level cure. Current guidance and reviews focus on prevention, diagnosis, disinfection, biosecurity, and pathogen-free broodstock or PL because no reliable in-pond treatment consistently clears infected shrimp.",
          "Antibiotics are not an EHP solution. EHP is a microsporidian parasite, not a normal bacterial disease, and casual antibiotic use can create residue, compliance, microbiome, and resistance problems without solving the underlying infection.",
          "Supportive feed additives can still have a role. Bacillus and other probiotics may support gut condition, water quality, organic matter processing, immune status, and microbial balance. They should be used as part of prevention and resilience planning, not described as a cure that removes EHP from infected hepatopancreas tissue.",
        ],
      },
      {
        heading: "Long-term prevention plan",
        body: [
          "Prevention starts before stocking. Use EHP-screened broodstock and post-larvae where possible, keep hatchery and PL batch records, and avoid stocking seed with unknown health status into ponds with a previous EHP problem.",
          "After an infected or suspected cycle, treat the pond as a spore-risk environment. Remove sludge, dry pond bottoms where the system allows it, disinfect according to qualified technical guidance, manage reservoirs and canals carefully, and do not rush re-stocking just because the water looks clear.",
          "During the cycle, maintain biosecurity discipline. Use dedicated pond tools, control people and equipment movement, prevent cross-contamination from sludge or harvest handling, monitor growth weekly, and use probiotics or Bacillus programs as a stability tool before the pond becomes overloaded.",
        ],
      },
      {
        heading: "How Shrimply records help",
        body: [
          "EHP becomes easier to manage when the farm can connect stocking source, pond history, sampling records, MBW, ADG, FCR, feed response, mortality, water quality, disease notes, lab results, and treatment actions in one place.",
          "For Orson AI and disease alerts, the useful input is not only one note that says EHP. The useful input is the last three to five sampling and water-quality records, feed response, mortality trend, pond history, PL source, and any PCR result. That context helps separate normal growth variation from a serious recurring disease pattern.",
        ],
      },
    ],
    checklist: [
      "Screen PL batches for EHP by PCR where diagnostic access is available.",
      "Record hatchery, PL batch, stocking date, pond history, and previous EHP or WFD notes.",
      "Track MBW, ADG, size variation, FCR, feed tray response, and appetite every cycle.",
      "Confirm suspected EHP with PCR, histology, or qualified lab testing instead of visual signs only.",
      "Stop movement of tools, shrimp, sludge, water, boots, and harvest equipment from suspect ponds to clean ponds.",
      "Remove sludge, dry pond bottoms, disinfect, and fallow high-risk ponds according to technical guidance after affected cycles.",
      "Use Bacillus or other probiotics as supportive gut and pond-stability tools, not as a cure for EHP.",
    ],
    sources: [
      sources.woahEhpDiseaseCard,
      sources.nacaEhpControl,
      sources.ehpDiagnosisReview,
      sources.ehpQpcrDetection,
      sources.ehpMicrobiomeProgression,
      sources.ehpFarmManagementInterview,
      sources.probioticsReview,
    ],
  },
  {
    slug: "white-spot-syndrome-virus-shrimp",
    section: "Water, Health, and Risk",
    label: "Disease Risk",
    author: defaultResourceAuthor,
    reviewer: defaultTechnicalReviewer,
    title: "WSSV in Shrimp: White Spot Syndrome Virus Response and Prevention",
    description: "A practical guide to WSSV in shrimp and white spot syndrome virus in vannamei, including early signs, rapid mortality risk, pond parameters, PCR confirmation, emergency response, and biosecurity prevention.",
    readTime: "9 min read",
    tags: ["WSSV", "white spot syndrome virus", "white spot disease", "PCR", "mortality", "biosecurity", "shrimp disease"],
    publishedAt: "2026-06-13",
    updatedAt: "2026-07-09",
    image: {
      src: "/resources/images/white-spot-syndrome-virus-wssv-shrimp-guide.png",
      alt: "White spot syndrome virus WSSV shrimp farming guide showing early detection, PCR confirmation, pond-to-pond containment, risk parameters, and prevention steps",
      width: 1671,
      height: 941,
    },
    relatedFeature: { label: "Disease Alerts", href: "/features/disease-alerts" },
    takeaways: [
      "WSSV is one of the fastest-moving viral diseases in shrimp farming and can cause severe pond losses if response is delayed.",
      "White spots may appear, but farms should not wait for perfect visual signs. Sudden appetite drop, abnormal swimming, rising mortality, and PCR confirmation matter more.",
      "There is no reliable in-pond cure for WSSV, so the correct response is rapid containment, movement control, lab testing, emergency harvest review, and strict prevention for future cycles.",
    ],
    sections: [
      {
        heading: "What WSSV actually is",
        body: [
          "White Spot Syndrome Virus, or WSSV, is a highly contagious viral pathogen of shrimp and other crustaceans. It affects penaeid shrimp including vannamei and is treated globally as one of the most serious disease threats in shrimp aquaculture.",
          "WSSV is different from slow-growth problems such as EHP. A farm may see weak appetite, abnormal behavior, and rising mortality over a short period, which makes speed of response more important than waiting for a perfect visual diagnosis.",
          "Because WSSV can move through animals, water, equipment, and crustacean carriers, every suspected case should be treated as both a pond-health problem and a biosecurity problem.",
        ],
      },
      {
        heading: "What farmers usually see",
        body: [
          "Early field signs can include sudden appetite drop, lethargy, shrimp gathering near pond edges, surface swimming, reddish discoloration, loose shell, and rapid mortality. White spots under the carapace may appear, but they are not always obvious in vannamei.",
          "That means farms should not wait for white spots before escalating. Appetite collapse and abnormal mortality are often more useful operational signals, especially when they appear together with recent weather stress, water instability, or nearby outbreak risk.",
          "WSSV can resemble other acute disease events, so visual signs should trigger containment and testing rather than a final diagnosis by eye.",
        ],
      },
      {
        heading: "Parameters and conditions that raise risk",
        body: [
          "The most important pond conditions to review are temperature stress, salinity shifts, unstable pH, low dissolved oxygen, high organic load, heavy sludge, recent rain or weather shock, and sudden changes in water exchange.",
          "These parameters do not create the virus from nothing, but they can stress shrimp, weaken pond stability, increase exposure pressure, and make a viral outbreak easier to miss until mortality accelerates.",
          "Farm teams should also review incoming water source, wild crustaceans, crabs, birds, shared equipment, harvest gear, staff movement, and nearby outbreak history. In WSSV prevention, pond biology and farm movement control are part of the same system.",
        ],
      },
      {
        heading: "Diagnosis and confirmation",
        body: [
          "WSSV should be confirmed with PCR or another approved diagnostic method where available. WOAH diagnostic guidance covers molecular and histological approaches because visual signs alone are not specific enough for confident diagnosis.",
          "A practical farm response should collect the right samples quickly, record the pond and time of observation, and connect the lab result back to mortality, appetite, water quality, weather, and recent pond movement records.",
          "If the farm has access to rapid screening, suspected ponds should be tested before movement decisions are relaxed. A negative or unclear result should still be interpreted with the full pond history and advice from qualified aquatic animal health support.",
        ],
      },
      {
        heading: "Immediate response when WSSV is suspected",
        body: [
          "Notify the farm lead immediately, isolate the suspect pond operationally, and stop unnecessary movement of water, shrimp, sludge, nets, trays, boots, harvest tools, vehicles, and staff from the suspect pond to clean ponds.",
          "Review mortality speed, shrimp size, buyer options, local rules, and food safety requirements before considering emergency harvest. Emergency harvest is a business and biosecurity decision, not a casual pond-management step.",
          "Record every action: when appetite dropped, when mortality began, which tools entered the pond, whether water was moved, what tests were sent, and what containment steps were applied. In WSSV, the response timeline matters.",
        ],
      },
      {
        heading: "Treatment reality",
        body: [
          "There is no dependable in-pond cure for WSSV. Antibiotics do not treat viruses, and casual antibiotic use can create residue, compliance, microbiome, and resistance problems without addressing the infection.",
          "Probiotics, vitamins, minerals, and immunostimulants may support general shrimp condition or pond stability, but they should not be presented as a cure for WSSV. Once a pond is strongly suspected, containment and protection of other ponds matter more than rescue claims.",
          "The most responsible plan is fast detection, strict movement control, lab confirmation, careful harvest decision-making, and prevention before the next cycle.",
        ],
      },
      {
        heading: "Long-term prevention plan",
        body: [
          "Prevention starts before stocking. Use PCR-screened PL, verify hatchery biosecurity, avoid risky seed sources, and keep batch records so any later outbreak can be traced back to stocking source and pond history.",
          "Control the water and carrier pathway. Treat or disinfect inlet water where practical, control crabs and wild crustaceans, reduce bird access, screen reservoirs where needed, and avoid moving untreated water from high-risk areas into culture ponds.",
          "Keep pond-level biosecurity simple and strict: dedicated tools by pond or zone, controlled staff movement, disinfected harvest gear, clean boots and vehicles, careful sludge handling, and clear rules for what happens when mortality rises.",
        ],
      },
      {
        heading: "How Shrimply records help",
        body: [
          "WSSV response depends on time. Shrimply helps connect mortality, appetite, feed response, water quality, sampling, pond notes, weather-related observations, lab results, treatments, and biosecurity actions in one operating record.",
          "For Orson AI and disease alerts, the useful input is the last several water-quality records, feed tray or appetite notes, mortality entries, sampling records, recent pond-to-pond movement, and any PCR result. That context helps the farm act faster and protects unaffected ponds from avoidable exposure.",
        ],
      },
    ],
    checklist: [
      "Watch sudden appetite drop, abnormal swimming, reddish body, weak shrimp, loose shell, and rising mortality.",
      "Do not wait for visible white spots before escalating a suspected WSSV event.",
      "Confirm suspected cases with PCR or approved lab testing where available.",
      "Stop movement of tools, water, shrimp, sludge, harvest equipment, boots, vehicles, and people from suspect ponds to clean ponds.",
      "Review emergency harvest only with farm leadership, buyer requirements, and local compliance in mind.",
      "Use PCR-screened PL, verified hatchery sources, treated inlet water, and stronger reservoir control.",
      "Control crabs, wild crustaceans, birds, shared equipment, and staff movement as part of routine WSSV prevention.",
      "Keep pond-specific records of mortality, appetite, water quality, lab results, and response actions.",
    ],
    sources: [
      sources.woahWssvManual,
      sources.wssvWaterTransmission,
      sources.wssvBiologyDiagnosis,
      sources.wssvMolecularDetection,
      sources.wssvCfspFactSheet,
      sources.wssvTransmissionDynamics,
      sources.worldfishDisease,
    ],
  },
  {
    slug: "shrimp-harvest-tracking",
    section: "Harvest and Finance",
    label: "Harvest and Finance",
    author: defaultResourceAuthor,
    reviewer: defaultOperationsReviewer,
    title: "Shrimp Harvest Tracking: What to Record Before, During, and After Harvest",
    description: "When should shrimp farmers harvest or partially harvest? Learn which pond, size, biomass, buyer, price, and cycle records support a well-documented harvest decision.",
    readTime: "6 min read",
    tags: ["when to harvest shrimp", "shrimp harvest", "partial harvest", "buyer", "shrimp price", "revenue", "cycle performance"],
    publishedAt: "2026-06-08",
    image: {
      src: "/resources/images/shrimp-harvest-tracking-partial-final-harvest.jpg",
      alt: "Shrimp harvest tracking infographic showing partial harvest, final harvest, buyer records, sale weight, price, revenue, and cycle performance",
      width: 1672,
      height: 941,
    },
    relatedFeature: { label: "Education Hub", href: "/resources" },
    takeaways: [
      "Harvest tracking should separate partial harvests from final harvests.",
      "Harvest records affect remaining biomass, revenue, and cycle analysis.",
      "Poor harvest records make FCR and profitability harder to trust.",
    ],
    faqs: [
      {
        question: "When should I harvest shrimp?",
        answer: "Harvest timing should be based on the farm's target size, current growth and survival, estimated biomass, feed demand, pond risk, buyer specifications, price, and operational readiness. It is a farm decision, not a fixed DOC rule.",
      },
      {
        question: "What should I record for a partial shrimp harvest?",
        answer: "Record the pond, date, harvest type, weight, size, buyer, price, rejects or mortality where relevant, and harvest conditions. Then update remaining biomass and the feeding plan so the cycle records remain accurate.",
      },
    ],
    sections: [
      {
        heading: "What harvest tracking should capture",
        body: [
          "A harvest record should include pond, date, harvest type, gross weight, saleable weight where relevant, size, buyer, price, mortality or rejects, and notes on harvest conditions. Partial harvests should also update remaining population and biomass assumptions.",
          "Harvest is the moment where biological records become business records. If harvest data is incomplete, the farm loses the ability to explain cycle performance.",
        ],
      },
      {
        heading: "Why partial harvests need extra care",
        body: [
          "Partial harvests can be useful, but they complicate records. The farm must know how much biomass left the pond and how that changes feeding, population, and final yield expectations.",
          "Industry guidance on partial harvesting notes operational disruption and water-quality concerns as practical issues. That makes planning and documentation important.",
        ],
      },
      {
        heading: "Connect harvest to the full cycle",
        body: [
          "After harvest, compare total yield, size, survival, FCR, cost, revenue, and major events during the cycle. This turns the harvest into learning for the next stocking plan.",
        ],
      },
    ],
    checklist: [
      "Record partial and final harvests separately.",
      "Capture weight, size, buyer, price, and harvest notes.",
      "Update remaining biomass after partial harvest.",
      "Review final yield against feed, sampling, and mortality records.",
    ],
    sources: [sources.partialHarvest, sources.faoVannamei, sources.profitabilityReview],
  },
  {
    slug: "shrimp-farm-cogs",
    section: "Harvest and Finance",
    label: "Harvest and Finance",
    author: defaultResourceAuthor,
    reviewer: defaultOperationsReviewer,
    title: "Shrimp Farm COGS: Understanding the True Cost of a Crop Cycle",
    description: "Is your shrimp crop profitable? Learn how to calculate shrimp farm cost of goods sold using feed, seed, labor, energy, treatments, harvest costs, and kilograms sold.",
    readTime: "7 min read",
    tags: ["shrimp farming profitability", "shrimp farm cost", "COGS", "farm finance", "feed cost", "cost per kg", "profitability", "cycle cost"],
    publishedAt: "2026-06-08",
    image: {
      src: "/resources/images/shrimp-farm-cogs-cycle-cost-profitability.jpg",
      alt: "Shrimp farm COGS infographic showing feed, seed, labor, energy, treatments, harvest cost, cost per kilogram, and cycle profitability",
      width: 1672,
      height: 941,
    },
    relatedFeature: { label: "Education Hub", href: "/resources" },
    takeaways: [
      "COGS connects production cost to harvested output.",
      "Feed, seed, labor, energy, and treatments should be tied to pond cycles.",
      "Profitability analysis improves when biological and finance records agree.",
    ],
    faqs: [
      {
        question: "How do I calculate shrimp farm profitability?",
        answer: "Start with complete cycle revenue, then compare it with feed, seed, labour, energy, treatments, harvest, logistics where relevant, and allocated overhead where the farm tracks it. Review the result alongside survival, FCR, growth, harvest size, and sale price.",
      },
      {
        question: "What costs should be included in shrimp farm COGS?",
        answer: "A practical cycle view includes seed, feed, labour, energy, pond preparation, minerals or treatments, health management, harvest labour, packing or logistics where relevant, and consistently allocated overhead. Record costs as they occur rather than reconstructing them after harvest.",
      },
    ],
    sections: [
      {
        heading: "Why COGS matters in shrimp farming",
        body: [
          "Cost of goods sold helps farms understand what it cost to produce the harvested shrimp. Without COGS, a harvest can look successful by weight but weak by margin.",
          "Research on shrimp profitability identifies feed, seed, medicine, energy, and labor as important variable costs. Feed management is especially important because it affects both production economics and water quality.",
        ],
      },
      {
        heading: "What costs belong in a cycle view",
        body: [
          "A practical COGS view should include seed, feed, labor, energy, pond preparation, minerals or treatments, health management, harvest labor, packing or logistics where relevant, and allocated overhead if the farm tracks it.",
          "The key is consistency. If a cost belongs to a pond cycle, record it close to the time it happens rather than reconstructing it after harvest.",
        ],
      },
      {
        heading: "Connect cost to farm performance",
        body: [
          "COGS should be reviewed with survival, FCR, growth, harvest size, and revenue. That combination shows whether the farm made money because production was strong, because price was favorable, or because costs were controlled.",
        ],
      },
    ],
    checklist: [
      "Track feed, seed, labor, energy, treatments, and harvest costs by cycle.",
      "Connect cost records to pond and harvest records.",
      "Review COGS per kilogram after each cycle.",
      "Compare cost movement with FCR and survival.",
    ],
    sources: [sources.profitabilityReview, sources.faoVannamei, sources.faoFeedManagement],
  },
  {
    slug: "shrimp-farm-cash-flow",
    section: "Harvest and Finance",
    label: "Harvest and Finance",
    author: defaultResourceAuthor,
    reviewer: defaultOperationsReviewer,
    title: "Shrimp Farm Cash Flow: Planning Feed, Seed, Labor, and Harvest Revenue",
    description: "Learn how shrimp farms can use cash-flow planning to manage seed purchases, feed demand, labor, treatments, harvest timing, and revenue gaps.",
    readTime: "6 min read",
    tags: ["cash flow", "farm finance", "feed demand", "seed", "harvest revenue"],
    publishedAt: "2026-06-08",
    image: {
      src: "/resources/images/shrimp-farm-cash-flow-feed-seed-harvest-revenue.jpg",
      alt: "Shrimp farm cash flow infographic showing seed purchases, feed demand, labor, treatments, harvest timing, buyer payments, and revenue gaps",
      width: 1672,
      height: 941,
    },
    relatedFeature: { label: "Education Hub", href: "/resources" },
    takeaways: [
      "Cash flow is about timing, not only total profit.",
      "Feed demand often rises before harvest revenue arrives.",
      "Cycle planning should include expected expenses and revenue timing.",
    ],
    sections: [
      {
        heading: "Why profitable farms can still feel cash pressure",
        body: [
          "Shrimp farms often spend heavily before harvest revenue arrives. Seed, feed, labor, energy, pond preparation, and treatments can create cash pressure even when the crop later sells well.",
          "Cash-flow planning helps managers see when money is needed, not just whether the cycle should be profitable at the end.",
        ],
      },
      {
        heading: "Plan around feed demand",
        body: [
          "Feed consumption usually increases as biomass grows. That means the farm should expect higher cash needs later in the cycle, especially if stocking density and growth are strong.",
          "Because feed is a major cost driver, feed inventory planning and cash-flow planning should be reviewed together.",
        ],
      },
      {
        heading: "Use harvest planning to reduce surprises",
        body: [
          "Partial harvest, final harvest timing, buyer payment terms, and expected size all affect cash flow. A good cash-flow view connects biological forecasts with finance expectations.",
        ],
      },
    ],
    checklist: [
      "Estimate seed, feed, labor, energy, and treatment costs before stocking.",
      "Update feed cash needs as biomass changes.",
      "Track expected harvest revenue and payment timing.",
      "Review cash flow weekly during high-feed periods.",
    ],
    sources: [sources.profitabilityReview, sources.faoFeedRecords, sources.partialHarvest],
  },
];

export const glossarySections: GlossarySection[] = [
  "Farm Management",
  "Feed and Inventory",
  "Growth and Sampling",
  "Water, Health, and Risk",
  "Harvest and Finance",
].map(section => ({
  title: section,
  description: {
    "Farm Management": "Core concepts for running a shrimp farm with cleaner records and better weekly decisions.",
    "Feed and Inventory": "Terms for feed control, stock movement, feed conversion, and waste reduction.",
    "Growth and Sampling": "Biological measurements used to understand shrimp growth, survival, and harvest readiness.",
    "Water, Health, and Risk": "Operational terms for pond conditions, disease signals, and risk visibility.",
    "Harvest and Finance": "Business terms for harvest planning, cost control, reporting, and profit visibility.",
  }[section]!,
  terms: resourceArticles.filter(article => article.section === section),
}));

export const getResourceArticle = (slug: string) =>
  resourceArticles.find(article => article.slug === slug);
