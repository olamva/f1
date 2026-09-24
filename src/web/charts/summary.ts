const quantile = (sorted: number[], q: number): number => {
  const i = (sorted.length - 1) * q;
  const lo = Math.floor(i);
  return sorted[lo]! + (sorted[Math.ceil(i)]! - sorted[lo]!) * (i - lo);
};

export const summary = (values: number[]) => {
  const s = [...values].sort((a, b) => a - b);
  return { min: s[0]!, q1: quantile(s, 0.25), median: quantile(s, 0.5), q3: quantile(s, 0.75), max: s.at(-1)! };
};

export const lapTime = (s: number): string => {
  const m = Math.floor(s / 60);
  const rest = (s - m * 60).toFixed(3).padStart(6, "0");
  return m ? `${m}:${rest}` : rest;
};
