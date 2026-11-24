import { useEffect, useState } from 'react';

const read = (key: string) => new URLSearchParams(window.location.search).get(key);

function writeSearchParam(key: string, value: string | null) {
  if (read(key) === value) return;
  const url = new URL(window.location.href);
  if (value) url.searchParams.set(key, value);
  else url.searchParams.delete(key);
  window.history.replaceState(window.history.state, '', url);
}

// A single query-string value as state. The setter is a plain state update (safe to call during render);
// an effect mirrors the value into the URL, replacing the current history entry.
export function useSearchParam(key: string) {
  const [value, setValue] = useState(() => read(key));

  useEffect(() => {
    writeSearchParam(key, value);
  }, [key, value]);

  useEffect(() => {
    const onPopState = () => setValue(read(key));
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [key]);

  return [value, setValue] as const;
}
