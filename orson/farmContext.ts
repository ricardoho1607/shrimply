import type { OrsonPromptPondPayload, OrsonQuestionFocus } from './types';

const severity = { info: 0, watch: 1, warning: 2, critical: 3 };
const score = (pond: OrsonPromptPondPayload) => severity[pond.overallSeverity ?? pond.outlook.level] ?? 0;

// Farm questions use an explicitly limited overview, not truncated diagnostic
// evidence. Detailed single-pond histories still use the existing full context.
export const buildFarmOverviewContext = (ponds: OrsonPromptPondPayload[], focus: OrsonQuestionFocus, activeCount: number, previousQuestion?: string): string => {
  const ranked = [...ponds].sort((a,b) => score(b)-score(a));
  const selected = ranked.slice(0,10);
  const counts = { info:0, watch:0, warning:0, critical:0 };
  ponds.forEach(pond => { counts[Object.keys(severity)[score(pond)] as keyof typeof counts]++; });
  const metric = (value: number | null, date: string | null | undefined) => ({ value, farm_date:date ?? null });
  return [
    'ORSON FARM SCOPE:', JSON.stringify({ active_pond_count:activeCount, requested_pond_count:ponds.length,
      included_pond_count:selected.length, omitted_pond_count:ponds.length-selected.length,
      selection:'Highest-risk pond summaries only. Risk counts cover all requested active ponds. Other ponds have not been individually described.' }),
    'ORSON QUESTION FOCUS:', JSON.stringify({ route:focus.route, intent:focus.intent, requested_dates:focus.requestedDates,
      requested_fields:focus.requestedFields, suppress_advice:focus.suppressAdvice,
      follow_up_to:previousQuestion ? {text:previousQuestion.slice(0,1000),shortened:previousQuestion.length>1000} : undefined,
      suppress_treatment_advice:focus.suppressTreatmentAdvice, suppress_pond_analysis:focus.suppressPondAnalysis,
      answer_contract:focus.answerContract, summary_only:true, detailed_history_included:false,
      response_format:'Use a compact Markdown table for pond comparisons: Pond | Current alert | Oxygen (mg/L, date) | pH | Weight (g) | Recorded feed (kg) | Lab. Current alert must contain only the exact risk_level label, never a measurement or an old alert description. Copy each numeric reading and its date from the corresponding summary field. Mark missing values as unknown. Put old measurement dates in their cells. Historical alerts are separate from current risk labels. Do not substitute old saved summaries for these calculated rows. After the table, give at most two short next steps. For more than ten ponds, explicitly state that only the highest-risk summaries are shown.',
      evidence_limit:'Only dated summaries are supplied. Do not claim causal diagnoses, historical trends, complete farm health, measured consumption, or numeric feeding/treatment targets. For missing dates or detailed history, ask which pond and time range to inspect.' }),
    'ORSON FARM OVERVIEW:', JSON.stringify({ risk_counts:counts,
      risk_counts_meaning:'Counts of calculated alerts, not proof of health. Missing data may have no alerts.', ponds:selected.map(pond => ({
      pond:pond.pondName, as_of_date:pond.diagnosticContext.asOfDate, risk_level:Object.keys(severity)[score(pond)],
      morning_ph:metric(pond.phMorningLatest,pond.evidence?.allMetrics.phMorning?.date),
      evening_ph:metric(pond.phEveningLatest,pond.evidence?.allMetrics.phEvening?.date),
      lowest_recorded_oxygen_mg_l:metric(pond.doMinimumLatest,pond.diagnosticContext.currentEvidenceDates.minimum_recorded_do),
      average_weight_g:metric(pond.latestMbwG,pond.diagnosticContext.currentEvidenceDates.mbw),
      adg_g_per_day:pond.adgGPerDay, growth_confidence:pond.growthConfidence,
      recorded_feed_kg:metric(pond.actualFeedKg,pond.evidence?.dailyFeed?.date),
      estimated_biomass_kg:pond.biomassKg, survival_confidence:pond.survivalConfidence,
      mortality:metric(pond.mortalityLatestCount,pond.mortalityLatestDate),
      lab_status:pond.labContext.worstStatus, lab_sample_date:pond.labContext.latest?.sampleDate ?? null,
      data_completeness_pct:Math.round(pond.dataCompletenessScore*100),
      findings:pond.findings.slice(0,3).map(f=>({severity:f.severity, summary:f.summary.slice(0,220), confidence:f.confidence,
        historical:f.isHistorical || f.status==='historical', event_date:f.eventDate ?? null,
        evidence:f.evidence.slice(0,2).map(value=>value.slice(0,160))})),
    })) }),
  ].join('\n\n').replace(/:\n\n/g, ':\n');
};
