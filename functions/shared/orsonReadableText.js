'use strict';

// Only known schema labels are translated; arbitrary names and values stay intact.
const LABELS = {
  recordedFcr: 'recorded FCR', recorded_fcr: 'recorded FCR',
  fcrBasis: 'FCR calculation method', fcr_basis: 'FCR calculation method',
  doMorning: 'morning oxygen', do_morning: 'morning oxygen', do_morning_mg_l: 'morning oxygen (mg/L)',
  doEvening: 'evening oxygen', do_evening: 'evening oxygen', do_evening_mg_l: 'evening oxygen (mg/L)',
  do_min_mg_l: 'lowest recorded oxygen (mg/L)',
  phMorning: 'morning pH', ph_morning: 'morning pH', phEvening: 'evening pH', ph_evening: 'evening pH', ph_swing: 'daily pH change',
  estimatedBiomassKg: 'estimated biomass', biomass_kg: 'estimated biomass (kg)', biomass_range_kg: 'estimated biomass range (kg)',
  survivalConfidence: 'confidence in the survival estimate', survival_confidence: 'confidence in the survival estimate', survival_pct: 'estimated survival (%)',
  feed_pressure_ratio: 'feed compared with the estimated need', expected_feed_kg: 'estimated feed need (kg)', actual_feed_kg: 'recorded feed (kg)',
  actualDailyFeedKg: 'recorded daily feed', actual_daily_feed_kg: 'recorded daily feed (kg)', totalDailyFeed: 'recorded daily feed', feed_kg: 'recorded feed (kg)',
  feeding_response: 'feeding response', salinity_ppt: 'salinity (ppt)', temperature_c: 'temperature (°C)', transparency_cm: 'water clarity (cm)',
  ammonia_mg_l: 'ammonia (mg/L)', mbw_g: 'average shrimp weight (g)', adg_g_per_day: 'daily weight gain (g/day)',
  daily_records_14d: 'recent daily records', diagnostic_context: 'pond evidence', growth_evidence: 'growth evidence',
};
const lookup = new Map(Object.entries(LABELS).map(([key, value]) => [key.toLowerCase(), value]));
const keys = Object.keys(LABELS).sort((a, b) => b.length - a.length).join('|');
const pattern = new RegExp('`?\\b(?:' + keys + ')\\b`?', 'gi');
const readableOrsonText = text => String(text || '')
  .replace(pattern, key => lookup.get(key.replace(/`/g, '').toLowerCase()))
  .replace(/\b(?:logged|recorded)\s+recorded FCR\b/gi, 'recorded FCR');

module.exports = { readableOrsonText };
