import { type MortalityObservationType } from "../../app/store/pondStore";
export interface FormData {
  pondName: string;
  pondArea: string;
  blockId: string;
  density: string;
  supplier: string;
  plValue: string;
  docStart: Date;
  cycleStartMode: 'new' | 'midcycle';
  baselineDate: Date;
  baselineMbw: string;
  baselineEstimatedPopulation: string;
  baselineSurvivalRate: string;
  baselineCumulativeFeed: string;
  cyclePondId: string;
  cycleId: string;
  cycleTargetMode: 'existing' | 'new';
  newCycleName: string;
  selectedPond: string;
  mbw: string;
  feed: string;
  samplingDate: Date;
  mortalityObservationType: MortalityObservationType;
  mortalityCount: string;
  siponShift: 'morning' | 'evening';
  siphonedCount: string;
  mortalCount: string;
  mortalityDate: Date;
  mortalityNotes: string;
}

export const pondNameCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base',
});

export const compareByPondName = (
  first: { pondName: string },
  second: { pondName: string }
) => pondNameCollator.compare(
  first.pondName.replace(/\s+/g, ''),
  second.pondName.replace(/\s+/g, '')
);
