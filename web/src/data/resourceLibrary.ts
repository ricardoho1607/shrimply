export type ResourceSource = {
  title: string;
  publisher: string;
  url: string;
};

export type ResourceArticle = {
  slug: string;
  section: string;
  label: string;
  title: string;
  description: string;
  readTime: string;
  tags?: string[];
  publishedAt?: string;
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
  }[];
  checklist: string[];
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
} satisfies Record<string, ResourceSource>;

export const resourceArticles: ResourceArticle[] = [
  {
    slug: "pond-performance",
    section: "Farm Management",
    label: "Farm Management",
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
    slug: "shrimp-cycle-planning",
    section: "Farm Management",
    label: "Farm Management",
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
    slug: "fcr-shrimp-farming",
    section: "Feed and Inventory",
    label: "Feed and Inventory",
    title: "FCR in Shrimp Farming: How to Use Feed Conversion Ratio Correctly",
    description: "Understand shrimp feed conversion ratio, why FCR matters, what can distort it, and how farms can use better records to reduce feed waste.",
    readTime: "7 min read",
    tags: ["FCR", "feed conversion ratio", "feed waste", "biomass", "partial harvest"],
    publishedAt: "2026-06-08",
    image: {
      src: "/resources/images/shrimp-fcr-feed-conversion-ratio-farming.jpg",
      alt: "Shrimp farmer calculating FCR with feed conversion ratio formula, feed used, biomass gain, water quality, appetite, and weekly FCR review",
      width: 1535,
      height: 1024,
    },
    relatedFeature: { label: "Education Hub", href: "/resources" },
    takeaways: [
      "FCR compares feed used against biomass gained, but bad records can make it misleading.",
      "Mortality, partial harvests, sampling quality, and feed stock errors all affect FCR.",
      "FCR should be reviewed with growth, water quality, survival, and feed behavior.",
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
          "Use FCR as a question generator. If FCR is rising, check appetite, tray returns, DO, ammonia, nitrite, mortality, and recent sampling accuracy. If FCR improves sharply, check whether biomass or harvest records are complete before assuming performance improved.",
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
    slug: "feed-inventory-control",
    section: "Feed and Inventory",
    label: "Feed and Inventory",
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
    relatedFeature: { label: "Education Hub", href: "/resources" },
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
    relatedFeature: { label: "Education Hub", href: "/resources" },
    takeaways: [
      "Feed trays help farms observe appetite instead of guessing.",
      "Tray results should be connected to water quality, weather, molting, and disease signals.",
      "Consistent tray records can reduce waste and improve feed decisions.",
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
    title: "Shrimp Pond Water Quality Trends: Reading DO, pH, Salinity, Ammonia, and Nitrite Together",
    description: "A practical guide to shrimp pond water-quality trends and why farmers should review dissolved oxygen, pH, temperature, salinity, ammonia, and nitrite together.",
    readTime: "7 min read",
    tags: ["water quality", "DO", "pH", "ammonia", "nitrite", "salinity"],
    publishedAt: "2026-06-08",
    image: {
      src: "/resources/images/shrimp-pond-water-quality-trends-monitoring.jpg",
      alt: "Shrimp pond water quality trends infographic comparing dissolved oxygen, pH, temperature, salinity, ammonia, and nitrite readings over time",
      width: 1672,
      height: 941,
    },
    relatedFeature: { label: "Education Hub", href: "/resources" },
    takeaways: [
      "Water quality should be interpreted as a trend, not isolated readings.",
      "Ammonia, nitrite, DO, pH, temperature, and salinity interact with shrimp stress.",
      "Feed waste and organic load can worsen water-quality risk.",
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
    title: "Shrimp Disease Alerts: Turning Farm Observations Into Faster Response",
    description: "Learn how shrimp farms can use mortality, appetite, water quality, behavior, and nearby disease risk to create practical disease alert workflows.",
    readTime: "7 min read",
    tags: ["disease alerts", "Vibrio", "AHPND", "EHP", "WSSV", "mortality", "biosecurity"],
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
    title: "Shrimp Mortality Tracking: How Loss Records Protect Biomass, FCR, and Harvest Planning",
    description: "A farmer-focused guide to shrimp mortality tracking and why accurate loss records improve biomass estimates, FCR, disease response, and harvest planning.",
    readTime: "6 min read",
    tags: ["mortality", "survival", "disease risk", "biomass", "AHPND"],
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
    slug: "shrimp-harvest-tracking",
    section: "Harvest and Finance",
    label: "Harvest and Finance",
    title: "Shrimp Harvest Tracking: What to Record Before, During, and After Harvest",
    description: "Learn which shrimp harvest records matter for partial harvests, final harvests, buyer readiness, pond history, revenue, and cycle performance.",
    readTime: "6 min read",
    tags: ["harvest", "partial harvest", "buyer", "revenue", "cycle performance"],
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
    title: "Shrimp Farm COGS: Understanding the True Cost of a Crop Cycle",
    description: "A practical guide to shrimp farm cost of goods sold, including feed, seed, labor, energy, treatments, harvest cost, and cycle profitability.",
    readTime: "7 min read",
    tags: ["COGS", "farm finance", "feed cost", "profitability", "cycle cost"],
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
