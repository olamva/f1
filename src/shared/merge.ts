export type Json =
  null | boolean | number | string | Json[] | { [k: string]: Json };

const isObject = (v: unknown): v is Record<string, Json> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

export function merge(base: Json | undefined, delta: Json): Json {
  if (!isObject(delta)) return delta;
  const out: Record<string, Json> | Json[] = Array.isArray(base)
    ? [...base]
    : isObject(base)
      ? { ...base }
      : {};
  const target = out as Record<string, Json>;
  for (const [k, v] of Object.entries(delta)) {
    if (k === "_kf") continue;
    if (k === "_deleted" && Array.isArray(v)) {
      for (const d of v) delete target[String(d)];
      continue;
    }
    target[k] = merge(target[k], v);
  }
  return out;
}
