import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { getFarmDateKey } from '../../shared/farmDate';

const FARM_DATE_REFRESH_MS = 30 * 1000;

export const useFarmDateKey = (timeZone?: string): string => {
  const [dateKey, setDateKey] = useState(() => getFarmDateKey(new Date(), timeZone));

  useEffect(() => {
    const refresh = () => setDateKey(getFarmDateKey(new Date(), timeZone));
    refresh();
    const interval = setInterval(refresh, FARM_DATE_REFRESH_MS);
    const subscription = AppState.addEventListener('change', refresh);

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [timeZone]);

  return dateKey;
};
