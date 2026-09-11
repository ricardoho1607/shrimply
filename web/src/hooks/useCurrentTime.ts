import { useEffect, useState } from 'react';

/** Refresh relative-time displays even when no new server snapshot arrives. */
export function useCurrentTime(intervalMs = 30_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}
