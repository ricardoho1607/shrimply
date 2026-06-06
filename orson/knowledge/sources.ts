import type { KnowledgeSource } from './knowledgeTypes';

export const KNOWLEDGE_SOURCES: KnowledgeSource[] = [
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
