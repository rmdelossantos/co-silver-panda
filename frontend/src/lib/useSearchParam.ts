import { useCallback, useEffect, useState } from 'react';

const read = (key: string) => new URLSearchParams(window.location.search).get(key);

// Rewrites one query-string value in place, without adding a history entry.
export function writeSearchParam(key: string, value: string | null) {
  const url = new URL(window.location.href);
  if (value) url.searchParams.set(key, value);
  else url.searchParams.delete(key);
  window.history.replaceState(window.history.state, '', url);
}

// A single query-string value as state. Updates replace the current history entry.
export function useSearchParam(key: string) {
  const [value, setValue] = useState(() => read(key));

  useEffect(() => {
    const onPopState = () => setValue(read(key));
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [key]);

  const update = useCallback(
    (next: string | null) => {
      writeSearchParam(key, next);
      setValue(next);
    },
    [key],
  );

  return [value, update] as const;
}
