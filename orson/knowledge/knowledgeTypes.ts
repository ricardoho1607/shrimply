import type { OrsonRiskSeverity } from '../types';

export type KnowledgeDomain = 'water_quality' | 'feed' | 'growth' | 'lab' | 'additive' | 'cross_parameter';

export type KnowledgeActionDirection = 'increase' | 'decrease' | 'stabilize' | 'investigate';

export interface KnowledgeSource {
  id: string;
  label: string;
  sourceType: 'curated_guidance' | 'research_anchor' | 'extension_guidance';
  reviewedAt: string;
}

export interface ParameterKnowledge {
  id: string;
  domain: KnowledgeDomain;
  label: string;
  aliases: string[];
  target?: string;
  warning?: string;
  critical?: string;
  evidenceBase: string;
  actions: Partial<Record<KnowledgeActionDirection, string[]>>;
  monitor: string[];
  cautions: string[];
  sourceIds: string[];
}

export interface CrossParameterRule {
  id: string;
  label: string;
  severity: OrsonRiskSeverity;
  conditions: string[];
  couldLeadTo: string[];
  actions: string[];
  cautions: string[];
  sourceIds: string[];
}

export interface SelectedKnowledge {
  parameterGuidance: ParameterKnowledge[];
  crossParameterRules: CrossParameterRule[];
  missingDataQuestions: string[];
  sourceLabels: string[];
}
