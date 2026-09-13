export const LANDING_LOCALES = ['en', 'id', 'th', 'vi'] as const;
export type LandingLocale = typeof LANDING_LOCALES[number];

const PUBLIC_PAGES = new Set([
  '/', '/about', '/how-it-works', '/orson', '/download',
  '/shrimp-farm-management-software', '/vannamei-shrimp-farming-app',
  '/shrimp-feed-management-software',
  '/shrimp-water-quality-monitoring-software',
  '/shrimp-growth-sampling-software',
]);
const FEATURES = new Set([
  'shrimp-harvest-tracking', 'disease-alerts', 'feed-inventory',
  'growth-sampling', 'water-quality-monitoring', 'shrimp-farm-finance',
]);

export function publicThemeRoute(pathname: string | null) {
  if (!pathname) return null;
  const normalized = pathname.replace(/\/+$/, '') || '/';
  const segments = normalized.split('/').filter(Boolean);
  const locale: LandingLocale = ['id', 'th', 'vi'].includes(segments[0])
    ? segments.shift() as LandingLocale : 'en';
  const path = `/${segments.join('/')}`;
  const isPublic = PUBLIC_PAGES.has(path)
    || (segments.length === 2 && segments[0] === 'features' && FEATURES.has(segments[1]))
    || (path === '/resources' || (segments.length === 2 && segments[0] === 'resources'))
    || (locale === 'en' && (path === '/auth' || path === '/auth/join'));
  return isPublic ? { locale, page: segments[0] || 'home', path } : null;
}

export function landingPath(locale: LandingLocale, path: string) {
  if (path === '/resources' || path.startsWith('/auth')) return path;
  return locale === 'en' ? path : `/${locale}${path === '/' ? '' : path}`;
}
