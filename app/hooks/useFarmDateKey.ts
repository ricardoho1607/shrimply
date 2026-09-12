import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { getFarmDateKeyAtRollover } from '../../shared/farmDate';

const FARM_DATE_REFRESH_MS = 30 * 1000;

export const useFarmDateKey = (timeZone?: string, rolloverHour: number = 0): string => {
  const [dateKey, setDateKey] = useState(() => getFarmDateKeyAtRollover(new Date(), timeZone, rolloverHour));

  useEffect(() => {
    const refresh = () => setDateKey(getFarmDateKeyAtRollover(new Date(), timeZone, rolloverHour));
    refresh();
    const interval = setInterval(refresh, FARM_DATE_REFRESH_MS);
    const subscription = AppState.addEventListener('change', refresh);

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [rolloverHour, timeZone]);

  return dateKey;
};
