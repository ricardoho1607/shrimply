export type PlanktonOverwatchState = 'insufficient' | 'stable' | 'watch' | 'high' | 'critical';

export interface PlanktonOverwatchSignal {
  id: string;
  category: string;
  points: number;
  severity: 'watch' | 'high' | 'critical';
  title: string;
  evidence: string;
  recommendation: string;
}

export interface PlanktonOverwatchSnapshot {
  version: number;
  state: PlanktonOverwatchState;
  score?: number;
  message: string;
  signals?: PlanktonOverwatchSignal[];
  recommendations?: string[];
  metrics?: {
    totalPlanktonCellPerMl?: number | null;
    cyanobacteriaPercent?: number | null;
    cyanobacteriaCellPerMl?: number | null;
    planktonChangePercent?: number | null;
    dawnDo?: number | null;
    phSwing?: number | null;
    feedingResponse?: 'strong' | 'normal' | 'weak' | null;
  };
  dataQuality?: {
    status?: 'good' | 'limited' | 'insufficient';
    missing?: string[];
  };
  sourceDate?: string | null;
  sourceType?: 'lab_report' | 'pond_record' | string;
  sourceId?: string;
  pondId?: string;
  pondName?: string;
  cycleId?: string | null;
  cycleName?: string | null;
  pondCycleId?: string | null;
  riskSignature?: string;
  evaluatedAt?: unknown;
}

export const PLANKTON_OVERWATCH_STATE_RANK: Record<PlanktonOverwatchState, number> = {
  insufficient: 0,
  stable: 1,
  watch: 2,
  high: 3,
  critical: 4,
};
