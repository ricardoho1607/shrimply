import { en } from './en';
import type { Language, Translations } from './index';
import { cycleFeatureTranslations } from '../../../shared/cycleFeatureTranslations';
import { planktonOverwatchLocalizedCopy } from '../../../shared/planktonOverwatchI18n';
import { dailyOperationsTranslations } from '../../../shared/dailyOperationsI18n';
import { pondDetailTranslations } from '../../../shared/pondDetailI18n';
import { harvestGuardTranslations } from '../../../shared/harvestGuardI18n';

type TranslationBase = typeof en | typeof import('./id').id | typeof import('./th').th | typeof import('./zh').zh | typeof import('./vi').vi;

const merge = (language: Language, base: TranslationBase): Translations => ({
  ...base,
  ...cycleFeatureTranslations[language],
  harvest: { ...base.harvest, ...harvestGuardTranslations[language] },
  dailyOperationsReports: dailyOperationsTranslations[language],
  pondDetail: pondDetailTranslations[language],
  waterQuality: { ...base.waterQuality, ...planktonOverwatchLocalizedCopy[language] },
}) as Translations;

export const englishTranslations = merge('en', en);
export const isLanguage = (value: unknown): value is Language =>
  typeof value === 'string' && ['en', 'id', 'th', 'zh', 'vi'].includes(value);

// Literal imports let Next emit one chunk per language. Reuse successful loads,
// but remove failed requests so an interrupted connection can be retried.
const loaders = {
  en: async () => englishTranslations,
  id: async () => merge('id', (await import('./id')).id),
  th: async () => merge('th', (await import('./th')).th),
  zh: async () => merge('zh', (await import('./zh')).zh),
  vi: async () => merge('vi', (await import('./vi')).vi),
};
const pending = new Map<Language, Promise<Translations>>();
export const loadTranslations = (language: Language): Promise<Translations> => {
  const existing = pending.get(language);
  if (existing) return existing;
  const request = loaders[language]().catch(error => {
    pending.delete(language);
    throw error;
  });
  pending.set(language, request);
  return request;
};
