"use client";
import {
  Droplets,
  Leaf
} from 'lucide-react';
import { useMemo } from 'react';
import {
  calculatePondMetricsWithHarvest,
  calculatePondMortalityForDate,
  detectFeedBiomassMismatchInsight,
  getSamplingMbw,
  isBaselineSampling
} from "../../../../../../shared/pondCalculations";
import type { usePondDetailState } from './usePondDetailState';
type Context = Pick<ReturnType<typeof usePondDetailState>,
  'pond'
  | 'company'
  | 'operationalToday'
  | 'today'
  | 'copy'>;
export function usePondDetailMetrics(context: Context) {
  const { pond, company, operationalToday, today, copy } = context;
  const metrics = useMemo(() => {
    if (!pond) return null;
    const samplings = (pond.samplings || []).filter(s => getSamplingMbw(s) > 0 || Number(s.mortality) > 0 || Number(s.feed) > 0 || Boolean(s.feedData));
    const sorted = [...samplings].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const latest = sorted[sorted.length - 1] || { mbw: 0, mortality: 0, feed: 0 };
    const docStart = new Date(pond.docStart);
    const biologicalMetrics = calculatePondMetricsWithHarvest(pond, company?.timeZone, { currentDateKey: operationalToday });
    const todayMortality = calculatePondMortalityForDate(pond, today, company?.timeZone);
    const feedBiomassInsight = detectFeedBiomassMismatchInsight(pond);

    const chartData = sorted
      .filter(s => getSamplingMbw(s) > 0)
      .map(s => ({
        x: Math.floor((new Date(s.date).getTime() - docStart.getTime()) / (1000 * 60 * 60 * 24)),
        y: getSamplingMbw(s)
      }));

    return {
      doc: biologicalMetrics.doc,
      population: biologicalMetrics.currentPopulation,
      biomass: biologicalMetrics.currentBiomass,
      sr: biologicalMetrics.adjustedSR,
      latest,
      chartData,
      adg: biologicalMetrics.adg,
      lastRecordedMBW: biologicalMetrics.latestMbw,
      size: biologicalMetrics.size,
      todayMortality: todayMortality.totalMortality,
      todayObservedMortality: todayMortality.observedRecovered,
      totalMortality: biologicalMetrics.totalMortality,
      totalMortalityWeight: biologicalMetrics.totalMortalityWeight,
      totalFeed: biologicalMetrics.totalFeedConsumed,
      fcr: biologicalMetrics.biomassGainFCR,
      feedBiomassInsight
    };
  }, [company?.timeZone, operationalToday, pond, today]);

  const currentCycleMortalityRecords = useMemo(() => {
    if (!pond) return [];
    const records = Array.isArray(pond.mortalityRecords) ? pond.mortalityRecords : [];
    return records
      .filter((r) => !r.pondCycleId || r.pondCycleId === pond.pondCycleId || r.pondCycleId === pond.id)
      .sort((a, b) => new Date(b.date || '').getTime() - new Date(a.date || '').getTime());
  }, [pond]);

  const getSamplingMbwAtDate = (dateStr?: string) => {
    if (!pond || !dateStr) return 0;
    const validSamplings = (pond.samplings || [])
      .filter((s) => !isBaselineSampling(s) && getSamplingMbw(s) > 0 && (s.date || '') <= dateStr)
      .sort((a, b) => new Date(b.date || '').getTime() - new Date(a.date || '').getTime());
    if (validSamplings.length > 0) return getSamplingMbw(validSamplings[0]);
    const baseline = (pond.samplings || []).find(isBaselineSampling);
    if (baseline && getSamplingMbw(baseline) > 0) return getSamplingMbw(baseline);
    return Number(pond.initialWeight || 0.5);
  };

  const latestLabStatus = pond?.latestLabStatus;

  const waterQualityLabStatus = latestLabStatus?.byType?.water_quality
    ?? (latestLabStatus?.reportType === 'water_quality' || (!latestLabStatus?.reportType && !latestLabStatus?.byType) ? latestLabStatus : undefined);

  const planktonLabStatus = latestLabStatus?.byType?.plankton
    ?? (latestLabStatus?.reportType === 'plankton' ? latestLabStatus : undefined);

  const labStatusCards = [
    { key: 'water_quality', title: copy.mineralQuality, Icon: Droplets, status: waterQualityLabStatus },
    { key: 'plankton', title: copy.planktonQuality, Icon: Leaf, status: planktonLabStatus },
  ].filter((item) => item.status);
  return { metrics, currentCycleMortalityRecords, getSamplingMbwAtDate, latestLabStatus, labStatusCards };
}
