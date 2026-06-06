export type OrsonCapability =
  | 'pond_health_analysis'
  | 'water_quality_risk_detection'
  | 'growth_adg_analysis'
  | 'feed_fcr_analysis'
  | 'appetite_stress_analysis'
  | 'harvest_projection_risk_analysis'
  | 'seventy_two_hour_outlook'
  | 'proactive_notifications';

export type OrsonUnsupportedClaim =
  | 'guaranteed_disease_prediction'
  | 'lab_confirmed_pathogen_analysis_without_lab_data'
  | 'image_based_disease_diagnosis'
  | 'weather_driven_forecast_without_weather_data'
  | 'live_iot_monitoring_without_sensor_data'
  | 'market_price_prediction_without_market_data'
  | 'thousands_of_farms_benchmark_without_dataset'
  | 'automatic_medication_or_chemical_treatment';

export type OrsonResponsePrinciple =
  | 'concise'
  | 'evidence_first'
  | 'actionable'
  | 'calm_professional'
  | 'clear_confidence'
  | 'clear_missing_data'
  | 'no_invented_measurements';

export const ORSON_PRODUCT_PROMISE =
  'Orson provides biological risk detection and 72-hour outlooks from farm data.' as const;

export const ORSON_SUPPORTED_CAPABILITIES: Record<OrsonCapability, string> = {
  pond_health_analysis:
    'Summarize current pond status using DOC, MBW, estimated biomass, mortality, water quality, feed, and appetite data where available.',
  water_quality_risk_detection:
    'Detect risk patterns from pH, DO, salinity, temperature if available, and recent trend direction.',
  growth_adg_analysis:
    'Calculate and interpret growth performance from valid MBW records while accounting for noisy manual sampling.',
  feed_fcr_analysis:
    'Analyze feed usage, estimated FCR, overfeeding risk, poor conversion risk, and mismatches between feed input and growth output.',
  appetite_stress_analysis:
    'Use feed tray or anco observations to detect appetite drops and possible hidden stress signals.',
  harvest_projection_risk_analysis:
    'Assess harvest projections using DOC, MBW, estimated biomass, market price, feed cost, and expected profit.',
  seventy_two_hour_outlook:
    'Produce a short outlook based on current risk level and trend direction, including confidence and the most important next action.',
  proactive_notifications:
    'Generate notifications after new records when deterministic rules identify meaningful risk.',
};

export const ORSON_UNSUPPORTED_CLAIMS: Record<OrsonUnsupportedClaim, string> = {
  guaranteed_disease_prediction:
    'Do not claim guaranteed disease prediction; Orson detects biological risk patterns and stress signals.',
  lab_confirmed_pathogen_analysis_without_lab_data:
    'Do not claim lab-confirmed pathogen or Vibrio assessment unless pathogen or Vibrio inputs exist.',
  image_based_disease_diagnosis:
    'Do not claim image-based disease diagnosis until image analysis is implemented.',
  weather_driven_forecast_without_weather_data:
    'Do not claim weather-driven forecasts until weather data is integrated.',
  live_iot_monitoring_without_sensor_data:
    'Do not claim live IoT monitoring unless sensor data is integrated.',
  market_price_prediction_without_market_data:
    'Do not claim market price prediction unless market data is integrated.',
  thousands_of_farms_benchmark_without_dataset:
    'Do not claim benchmarking against thousands of farms unless Shrimply has a real benchmark dataset.',
  automatic_medication_or_chemical_treatment:
    'Do not provide definitive medication, antibiotic, or chemical treatment prescriptions without expert review.',
};

export const ORSON_RESPONSE_PRINCIPLES: Record<OrsonResponsePrinciple, string> = {
  concise: 'Keep responses short unless the user asks for detail.',
  evidence_first: 'Show the pond data evidence behind every important conclusion.',
  actionable: 'Give a practical next action when a risk is identified.',
  calm_professional: 'Use a calm, professional aquaculture consultant tone.',
  clear_confidence: 'State confidence when data quality or evidence strength matters.',
  clear_missing_data: 'Say what is missing instead of inventing measurements.',
  no_invented_measurements: 'Never create pH, DO, MBW, feed, mortality, or pathogen values that are not in the records.',
};

export const ORSON_STANDARD_RESPONSE_SHAPE = [
  'Risk level and short summary.',
  'Evidence from the pond data.',
  'Recommended next action.',
  '72-hour outlook or confidence, when useful.',
] as const;

export const ORSON_PARAMETER_ACTION_GUIDANCE = {
  dissolved_oxygen: {
    evidenceBase: 'FAO shrimp pond management guidance treats dissolved oxygen as critical for shrimp growth and survival.',
    practicalSteps: [
      'Increase aeration immediately, especially before sunrise when DO is usually lowest.',
      'Hold or reduce feeding until DO recovers because digestion and decomposition increase oxygen demand.',
      'Check sludge, dead algae, and uneaten feed because organic load consumes oxygen.',
      'Recheck DO before the next feeding window and compare morning vs evening readings.',
    ],
    cautions: [
      'Do not increase feed while DO is unstable.',
      'If DO is severely low, treat it as urgent and verify equipment coverage across the pond.',
    ],
  },
  ph: {
    evidenceBase: 'FAO aquaculture guidance notes pH affects ammonia toxicity, and shrimp pond guidance links pH swing to plankton and alkalinity stability.',
    practicalSteps: [
      'Confirm whether the issue is high pH, low pH, or a large morning-evening swing.',
      'Check alkalinity and plankton condition before changing chemistry; unstable algae often drives pH swings.',
      'Reduce feed pressure and organic loading if pH is high with ammonia risk.',
      'Use gradual water exchange only when source water is verified and the change will not shock salinity or temperature.',
    ],
    cautions: [
      'Do not chase pH with sudden acid or lime dosing without an on-site protocol.',
      'For ammonia risk, high pH makes un-ionized ammonia more dangerous.',
    ],
  },
  ammonia: {
    evidenceBase: 'FAO guidance identifies pH and temperature as controls of the more toxic un-ionized ammonia fraction.',
    practicalSteps: [
      'Stop feed increases and reduce feed if appetite, DO, or water quality is weak.',
      'Remove organic load drivers: uneaten feed, sludge, dead algae, and excessive fertilization.',
      'Increase aeration to support nitrification and protect shrimp while the pond stabilizes.',
      'If available, use controlled water exchange with tested source water to dilute TAN.',
      'Track pH and temperature together with ammonia because toxicity rises as pH and temperature rise.',
    ],
    cautions: [
      'Do not judge ammonia risk from TAN alone; pH and temperature change toxicity.',
      'Avoid aggressive chemical fixes unless a farm technician has confirmed the dose and pond volume.',
    ],
  },
  nitrite: {
    evidenceBase: 'Aquaculture water-quality guidance treats nitrite as a nitrogen-cycle risk that often follows ammonia oxidation problems.',
    practicalSteps: [
      'Reduce feed pressure while nitrite is elevated because excess feed adds nitrogen load.',
      'Improve aeration and biofilter/nitrification conditions.',
      'Use partial water exchange only with clean, tested source water.',
      'Check alkalinity because nitrification consumes alkalinity and can stall when buffering is weak.',
      'For brackish systems, chloride management may reduce nitrite toxicity, but dosing should follow farm protocol.',
    ],
    cautions: [
      'Do not add salt or chloride blindly without checking salinity, species tolerance, and pond volume.',
    ],
  },
  salinity: {
    evidenceBase: 'Shrimp pond management guidance treats abrupt salinity movement as a stress risk.',
    practicalSteps: [
      'Change salinity gradually; avoid sharp dilution or concentration shifts.',
      'If salinity is too high, dilute slowly with tested lower-salinity water over multiple exchanges.',
      'If salinity is too low, raise it gradually with verified source water or farm-approved mineral protocol.',
      'Watch appetite and mortality after salinity movement because stress can lag behind the change.',
    ],
    cautions: [
      'Do not correct salinity abruptly; osmotic shock can be worse than the original reading.',
    ],
  },
  alkalinity: {
    evidenceBase: 'Aquaculture guidance links alkalinity to pH buffering and nitrification stability.',
    practicalSteps: [
      'If alkalinity is low, stabilize buffering gradually using the farm liming or bicarbonate protocol.',
      'If alkalinity is high, first confirm whether it is causing a real pH or hardness problem before trying to reduce it.',
      'Use water exchange with tested source water when reduction is needed and safe.',
      'Track pH swing after any alkalinity adjustment.',
    ],
    cautions: [
      'Do not adjust alkalinity without checking pH swing and source-water chemistry.',
    ],
  },
  plankton_transparency: {
    evidenceBase: 'Shrimp pond guidance connects water color, transparency, pH swing, and oxygen demand with plankton condition.',
    practicalSteps: [
      'If bloom is too dense or transparency is too low, reduce nutrient inputs and feed pressure.',
      'Increase aeration because dense plankton can depress DO at night and early morning.',
      'Use gradual water exchange only if source water is stable.',
      'If harmful plankton is confirmed by lab, prioritize the lab recommendation and monitor DO, pH swing, and appetite closely.',
    ],
    cautions: [
      'Do not crash a bloom abruptly; dead algae can consume oxygen and worsen ammonia.',
    ],
  },
} as const;

export const ORSON_ACTION_GUIDANCE_SOURCES = [
  'FAO shrimp pond operation and water-quality management guidance',
  'FAO aquaculture water chemistry guidance on ammonia toxicity, pH, and temperature',
  'Southern Regional Aquaculture Center water-quality and feeding-management extension guidance',
] as const;
