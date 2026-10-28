export const MAX_DELAY_S = 300;

const checks: Record<string, (v: any) => boolean> = {
  delay: (v) => typeof v === "number" && v >= 0 && v <= MAX_DELAY_S,
  favourite: (v) =>
    v === null ||
    (/^[a-z0-9_]+$/.test(v?.id) &&
      /^[A-Z]{3}$/.test(v?.code) &&
      Object.keys(v).length === 2),
};

export const SYNCED = Object.keys(checks);

export const validSettings = (patch: any) =>
  patch?.constructor === Object &&
  Object.entries(patch).every(
    ([key, value]) => Object.hasOwn(checks, key) && checks[key]!(value),
  );
