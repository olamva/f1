const BASE = "https://api.jolpi.ca/ergast/f1/";
const SPACING_MS = 300;
const FRESH_MS = 10 * 60_000;

type Entry = { at: number; body: Promise<any> };
const cache = new Map<string, Entry>();
let queue: Promise<unknown> = Promise.resolve();
let retryAt = 0;

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

function throttled(url: string): Promise<any> {
  const run = queue.then(async () => {
    for (let attempt = 0; ; attempt++) {
      if (retryAt - Date.now() > 60_000)
        throw new Error(`jolpica cooldown ${url}`);
      await pause(Math.max(0, retryAt - Date.now()));
      const res = await fetch(url, {
        headers: { "User-Agent": "f1.ola-vassbotn.no" },
      });
      await pause(SPACING_MS);
      if (res.status === 429) {
        const header = res.headers.get("Retry-After");
        const delay = header?.trim()
          ? /^\d+(\.\d+)?$/.test(header)
            ? Number(header) * 1000
            : Date.parse(header) - Date.now()
          : NaN;
        retryAt =
          Date.now() +
          Math.max(SPACING_MS, Number.isFinite(delay) ? delay : 60_000);
        await res.body?.cancel();
        if (attempt < 2 && retryAt - Date.now() <= 60_000) continue;
      }
      if (!res.ok) throw new Error(`jolpica ${res.status} ${url}`);
      return res.json();
    }
  });
  queue = run.catch(() => undefined);
  return run;
}

export function json(path: string, freshMs = FRESH_MS): Promise<any> {
  const hit = cache.get(path);
  if (hit && Date.now() - hit.at < freshMs) return hit.body;
  const request = throttled(path);
  const body = hit ? request.catch(() => hit.body) : request;
  const entry = { at: Date.now(), body };
  cache.set(path, entry);
  request.catch(() => {
    if (cache.get(path) === entry) {
      if (hit) cache.set(path, hit);
      else cache.delete(path);
    }
  });
  return body;
}

export const get = (path: string, freshMs = FRESH_MS): Promise<any> =>
  json(BASE + path, freshMs).then((data) => data.MRData);

export async function all<T>(
  path: string,
  pick: (data: any) => T[],
  freshMs = FRESH_MS,
): Promise<T[]> {
  const join = path.includes("?") ? "&" : "?";
  const first = await get(`${path}${join}limit=100&offset=0`, freshMs);
  const total = Number(first.total);
  const rest = await Promise.all(
    Array.from({ length: Math.ceil(total / 100) - 1 }, (_, i) =>
      get(`${path}${join}limit=100&offset=${(i + 1) * 100}`, freshMs),
    ),
  );
  return [first, ...rest].flatMap(pick);
}

export const total = async (path: string, freshMs?: number): Promise<number> =>
  Number((await get(`${path}?limit=1`, freshMs)).total);
