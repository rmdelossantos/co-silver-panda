import { useCallback, useEffect, useState } from 'react';

const read = (key: string) => new URLSearchParams(window.location.search).get(key);

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
      const url = new URL(window.location.href);
      if (next) url.searchParams.set(key, next);
      else url.searchParams.delete(key);
      window.history.replaceState(window.history.state, '', url);
      setValue(next);
    },
    [key],
  );

  return [value, update] as const;
}
