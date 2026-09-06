import en from './en.json';
import id from './id.json';
import th from './th.json';
import vi from './vi.json';
import type { LandingLocale } from './publicRoutes';

export type LandingCopy = typeof en;
export const landingCopy: Record<LandingLocale, LandingCopy> = { en, id, th, vi };
