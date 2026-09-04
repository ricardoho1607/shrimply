import type { KnowledgeSource } from './knowledgeTypes';

export const KNOWLEDGE_SOURCES: KnowledgeSource[] = [
  { id: 'fao-shrimp-feed-management', label: 'FAO: Shrimp feed management — issues and perspectives (2013)', sourceType: 'extension_guidance', reviewedAt: '2026-09-04', url: 'https://www.fao.org/fishery/docs/CDrom/T583/root/18.pdf' },
  { id: 'fao-shrimp-culture', label: 'FAO: Report of the training course on shrimp culture', sourceType: 'extension_guidance', reviewedAt: '2026-09-04', url: 'https://www.fao.org/4/ac418e/AC418E03.htm' },
  { id: 'fao-shrimp-health', label: 'FAO: Disease prevention and health management in coastal shrimp culture', sourceType: 'extension_guidance', reviewedAt: '2026-09-04', url: 'https://www.fao.org/fishery/docs/CDrom/aquaculture/a0845t/volume2/docrep/field/377193.htm' },
  { id: 'shrimply-diagnostic-calculations', label: 'Shrimply calculation contracts: dailyOperationsReport and labMeasurementContract', sourceType: 'curated_guidance', reviewedAt: '2026-09-04' },
  {
    id: 'shrimply-vannamei-water-quality-v1',
    label: 'Shrimply curated vannamei water-quality guidance v1',
    sourceType: 'curated_guidance',
    reviewedAt: '2026-06-06',
  },
  {
    id: 'shrimply-vannamei-cross-parameter-v1',
    label: 'Shrimply curated vannamei cross-parameter risk rules v1',
    sourceType: 'curated_guidance',
    reviewedAt: '2026-06-06',
  },
  {
    id: 'shrimply-vannamei-feed-v1',
    label: 'Shrimply curated vannamei feed-control guidance v1',
    sourceType: 'curated_guidance',
    reviewedAt: '2026-06-06',
  },
  {
    id: 'shrimply-vannamei-growth-v1',
    label: 'Shrimply curated vannamei growth guidance v1',
    sourceType: 'curated_guidance',
    reviewedAt: '2026-06-06',
  },
  {
    id: 'shrimply-vannamei-lab-plankton-v1',
    label: 'Shrimply curated vannamei microbial lab and plankton guidance v1',
    sourceType: 'curated_guidance',
    reviewedAt: '2026-06-06',
  },
  {
    id: 'shrimply-vannamei-additives-v1',
    label: 'Shrimply curated vannamei additive and product-label guidance v1',
    sourceType: 'curated_guidance',
    reviewedAt: '2026-08-25',
  },
  {
    id: 'fao-srac-anchor',
    label: 'FAO and SRAC aquaculture extension principles summarized in Shrimply guidance',
    sourceType: 'extension_guidance',
    reviewedAt: '2026-06-06',
  },
];

export const getKnowledgeSourceLabels = (sourceIds: string[]): string[] => {
  const uniqueIds = Array.from(new Set(sourceIds));
  return uniqueIds
    .map((id) => KNOWLEDGE_SOURCES.find((source) => source.id === id)?.label)
    .filter((label): label is string => Boolean(label));
};
