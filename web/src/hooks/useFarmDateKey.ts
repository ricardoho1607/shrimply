"use client";

import { useEffect, useState } from 'react';
import { getFarmDateKey } from '../../../shared/farmDate';

const FARM_DATE_REFRESH_MS = 30_000;

export const useFarmDateKey = (timeZone?: string): string => {
  const [dateKey, setDateKey] = useState(() => getFarmDateKey(new Date(), timeZone));

  useEffect(() => {
    const refresh = () => setDateKey(getFarmDateKey(new Date(), timeZone));
    refresh();
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    const interval = window.setInterval(refresh, FARM_DATE_REFRESH_MS);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [timeZone]);

  return dateKey;
};
