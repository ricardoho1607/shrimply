import type { SVGProps } from 'react';

export type DashboardIconName =
  | 'company-details'
  | 'home'
  | 'ponds'
  | 'water-quality'
  | 'feed'
  | 'harvest'
  | 'marketplace'
  | 'disease-report'
  | 'orson-ai'
  | 'harvest-projections'
  | 'notifications'
  | 'finance'
  | 'reports'
  | 'financial-reports'
  | 'sampling-reports'
  | 'daily-operations'
  | 'cycle-reports'
  | 'inventory'
  | 'feeds-additives'
  | 'treatment-mixes'
  | 'assets'
  | 'settings'
  | 'logout';

type DashboardIconProps = Omit<SVGProps<SVGSVGElement>, 'name'> & {
  name: DashboardIconName;
  size?: number;
};

const commonProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  focusable: 'false' as const,
  'aria-hidden': true,
};

export function DashboardIcon({ name, size = 18, ...props }: DashboardIconProps) {
  const icon = (() => {
    switch (name) {
      case 'company-details':
        return <><path d="M4 19V9l8-4 8 4v10"/><path d="M8 19v-5h8v5"/><path d="M3 20h18"/><path d="M6.5 10.5c1 .7 2 .7 3 0s2-.7 3 0 2 .7 3 0 2 .7 3 0"/></>;
      case 'home':
        return <><rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="5" rx="2"/><rect x="13" y="10" width="8" height="11" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/></>;
      case 'ponds':
        return <><rect x="3" y="4" width="18" height="16" rx="4"/><path d="M6 10c1.3 1 2.7 1 4 0s2.7-1 4 0 2.7 1 4 0"/><path d="M6 15c1.3 1 2.7 1 4 0s2.7-1 4 0 2.7 1 4 0"/></>;
      case 'water-quality':
        return <><path d="M12 3s6 6.1 6 11a6 6 0 0 1-12 0c0-4.9 6-11 6-11Z"/><path d="M9 15.5c1.5 1.2 4.5 1.2 6 0"/><path d="M10 12.5h4"/></>;
      case 'feed':
        return <><path d="M8 3h8l-1 3 2 2 1.5 12h-13L7 8l2-2-1-3Z"/><path d="M7 8h10"/><path d="M9 14c2-1.8 4-1.8 6 0-2 1.8-4 1.8-6 0Z"/><path d="M12 12v4"/></>;
      case 'harvest':
        return <><rect x="7" y="2.5" width="10" height="5.5" rx="1.5"/><path d="M9 5h4.5m1.5 0h.5"/><path d="M12 8v5"/><path d="m6 14 1.5-2h9l1.5 2"/><path d="M6 14h12l2 6H4l2-6Z"/><path d="M7 20v1.5m10-1.5v1.5"/></>;
      case 'marketplace':
        return <><path d="M4 9v11h16V9"/><path d="M3 9l2-5h14l2 5"/><path d="M3 9a3 3 0 0 0 5 2 3 3 0 0 0 4 0 3 3 0 0 0 4 0 3 3 0 0 0 5-2"/><path d="M9 20v-5h6v5"/></>;
      case 'disease-report':
        return <><path d="M12 3 5 6v5c0 4.7 2.8 8 7 10 4.2-2 7-5.3 7-10V6l-7-3Z"/><circle cx="12" cy="10" r="2"/><path d="M12 6v2M12 12v3M8 10H6m12 0h-2M9.2 7.2 8 6m6.8 1.2L16 6"/></>;
      case 'orson-ai':
        return <><path d="M10.7 2.5c.7 4.7 3.9 7.9 8.6 8.6-4.7.7-7.9 3.9-8.6 8.6-.7-4.7-3.9-7.9-8.6-8.6 4.7-.7 7.9-3.9 8.6-8.6Z"/><path d="M18.3 2.8c.2 1.6 1.3 2.7 2.9 2.9-1.6.2-2.7 1.3-2.9 2.9-.2-1.6-1.3-2.7-2.9-2.9 1.6-.2 2.7-1.3 2.9-2.9Z"/></>;
      case 'harvest-projections':
        return <><path d="M4 20V5"/><path d="M4 20h16"/><path d="m7 16 4-4 3 2 5-7"/><path d="M15 7h4v4"/><circle cx="8" cy="8" r="2"/><path d="M8 6V4m0 6v1M6 8H5m5 0h1"/></>;
      case 'notifications':
        return <><path d="M18 9a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z"/><path d="M10 21h4"/><circle cx="18" cy="5" r="2.5" fill="#3282B8" stroke="none"/></>;
      case 'finance':
        return <><path d="M4 7h15a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h12"/><path d="M16 11h5v5h-5a2.5 2.5 0 0 1 0-5Z"/><circle cx="17" cy="13.5" r=".6" fill="currentColor" stroke="none"/></>;
      case 'reports':
        return <><path d="M7 3h8l4 4v14H7V3Z"/><path d="M15 3v5h4"/><path d="M10 12h6m-6 4h6"/><path d="M4 6v12"/></>;
      case 'financial-reports':
        return <><path d="M5 3h10l4 4v14H5V3Z"/><path d="M15 3v5h4"/><path d="M8 17v-3m4 3v-6m4 6v-8"/></>;
      case 'sampling-reports':
        return <><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2h6v2"/><path d="M8 10c2 1.5 6 1.5 8 0"/><path d="m12 8 1.5 1.5L12 11l-1.5-1.5L12 8Z"/><path d="M8 16h3m2 0h3"/></>;
      case 'daily-operations':
        return <><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 9h18"/><path d="m8 15 2 2 5-5"/></>;
      case 'cycle-reports':
        return <><path d="M19 8a8 8 0 0 0-13-2L4 8"/><path d="M4 4v4h4"/><path d="M5 16a8 8 0 0 0 13 2l2-2"/><path d="M20 20v-4h-4"/><path d="M10 9h4v6h-4z"/></>;
      case 'inventory':
        return <><path d="m12 3 8 4-8 4-8-4 8-4Z"/><path d="m4 7 8 4 8-4v10l-8 4-8-4V7Z"/><path d="M12 11v10"/></>;
      case 'feeds-additives':
        return <><path d="M5 6h10l2 4-1 10H4L3 10l2-4Z"/><path d="M6 6V3h8v3"/><circle cx="9" cy="13" r="1"/><circle cx="13" cy="16" r="1"/><path d="M19 5v6m-3-3h6"/></>;
      case 'treatment-mixes':
        return <><path d="M9 3h6M10 3v6l-5 8a2.6 2.6 0 0 0 2.2 4h9.6A2.6 2.6 0 0 0 19 17l-5-8V3"/><path d="M7 16h10"/><path d="M9 16c1-2 2-2 3 0s2 2 3 0"/><circle cx="13" cy="12" r=".7" fill="currentColor" stroke="none"/></>;
      case 'assets':
        return <><path d="M3 20h18"/><path d="M5 20V8l7-4 7 4v12"/><path d="M9 20v-5h6v5"/><circle cx="12" cy="10" r="2.2"/><path d="M12 6.5v1M12 12.2v1M8.5 10h1m5 0h1"/></>;
      case 'settings':
        return <><path d="M4 6h7m4 0h5M4 12h3m4 0h9M4 18h9m4 0h3"/><circle cx="13" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="15" cy="18" r="2"/></>;
      case 'logout':
        return <><path d="M10 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h5"/><path d="M14 8l4 4-4 4"/><path d="M8 12h10"/></>;
    }
  })();

  return <svg {...commonProps} {...props} width={size} height={size}>{icon}</svg>;
}
