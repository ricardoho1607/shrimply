"use client";

import { useEffect, useState } from 'react';
import { getFarmDateKeyAtRollover } from '../../../shared/farmDate';

const FARM_DATE_REFRESH_MS = 30_000;

export const useFarmDateKey = (timeZone?: string, rolloverHour: number = 0): string => {
  const [dateKey, setDateKey] = useState(() => getFarmDateKeyAtRollover(new Date(), timeZone, rolloverHour));

  useEffect(() => {
    const refresh = () => setDateKey(getFarmDateKeyAtRollover(new Date(), timeZone, rolloverHour));
    refresh();
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    const interval = window.setInterval(refresh, FARM_DATE_REFRESH_MS);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [rolloverHour, timeZone]);

  return dateKey;
};
