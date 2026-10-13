"use client";

import { useEffect, useState } from 'react';

type Subscribe<T> = (next: (data: T) => void, fail: (error: Error) => void) => () => void;

/** Bind displayed data to its subscription, including the render before effect cleanup. */
export function useScopedSnapshot<T>(scope: string | null, subscribe: Subscribe<T>, empty: T) {
  const [state, setState] = useState<{
    scope: string;
    subscribe: Subscribe<T>;
    data: T;
    error: Error | null;
  } | null>(null);

  useEffect(() => {
    if (!scope) return;
    let active = true;
    const unsubscribe = subscribe(
      data => { if (active) setState({ scope, subscribe, data, error: null }); },
      error => { if (active) setState({ scope, subscribe, data: empty, error }); },
    );
    return () => {
      active = false;
      unsubscribe();
    };
  }, [scope, subscribe, empty]);

  if (!scope || state?.scope !== scope || state.subscribe !== subscribe) {
    return { data: empty, loading: Boolean(scope), error: null };
  }
  return { data: state.data, loading: false, error: state.error };
}
