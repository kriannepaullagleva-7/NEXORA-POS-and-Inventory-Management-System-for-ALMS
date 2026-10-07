import { useCallback, useEffect, useRef, useState } from 'react';

export interface AsyncState<T> {
  data: T;
  loading: boolean;
  error: string | null;
  /** Re-runs the loader; use after a mutation so the table reflects the database. */
  reload: () => Promise<void>;
  /** Local override for optimistic updates. */
  setData: React.Dispatch<React.SetStateAction<T>>;
}

/**
 * Runs an async loader on mount and exposes loading/error/reload state.
 * `deps` re-runs the loader when they change.
 */
export function useAsync<T>(loader: () => Promise<T>, initial: T, deps: unknown[] = []): AsyncState<T> {
  const [data, setData] = useState<T>(initial);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mounted = useRef(true);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await loaderRef.current();
      if (mounted.current) setData(result);
    } catch (e) {
      if (mounted.current) setError(e instanceof Error ? e.message : 'Failed to load data.');
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error, reload: run, setData };
}
