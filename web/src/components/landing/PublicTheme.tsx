'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { publicThemeRoute } from './publicRoutes';

export default function PublicTheme({ children }: { children: ReactNode }) {
  const route = publicThemeRoute(usePathname());
  if (!route) return children;
  return <div className="ocean-theme" data-public-page={route.page} lang={route.locale}>{children}</div>;
}
