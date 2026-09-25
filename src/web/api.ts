import { useEffect, useState } from "react";

export async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const body = await res.json();
  if (!res.ok) throw new Error(body?.error ?? `HTTP ${res.status}`);
  return body as T;
}

export type Loaded<T> = { data: T | null; error: string | null };

export function useJson<T>(url: string | null, refreshMs?: number): Loaded<T> {
  const [state, setState] = useState<Loaded<T>>({ data: null, error: null });
  useEffect(() => {
    if (!url) return;
    let alive = true;
    const load = () =>
      getJson<T>(url).then(
        (data) => alive && setState({ data, error: null }),
        (e: Error) =>
          alive && setState((s) => ({ data: s.data, error: e.message })),
      );
    setState({ data: null, error: null });
    load();
    const id = refreshMs ? setInterval(load, refreshMs) : undefined;
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [url, refreshMs]);
  return state;
}
