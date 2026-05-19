// translations/index.ts
import { en, Translations } from './en';
import { id } from './id';
import { th } from './th';
import { zh } from './zh';
import { vi } from './vi';

export const translations = {
  en,
  id,
  th,
  zh,
  vi,
};

export type Language = keyof typeof translations;
export type { Translations };