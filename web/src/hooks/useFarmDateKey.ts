"use client";

import { useEffect, useState } from 'react';
import { getFarmDateKey } from '../../../shared/farmDate';

const FARM_DATE_REFRESH_MS = 30 * 1000;

export const useFarmDateKey = (timeZone?: string): string => {
  const [dateKey, setDateKey] = useState(() => getFarmDateKey(new Date(), timeZone));

  useEffect(() => {
    const refresh = () => setDateKey(getFarmDateKey(new Date(), timeZone));
    refresh();
    const interval = window.setInterval(refresh, FARM_DATE_REFRESH_MS);
    document.addEventListener('visibilitychange', refresh);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [timeZone]);

  return dateKey;
};
