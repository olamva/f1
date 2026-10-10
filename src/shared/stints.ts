type Obj = Record<string, any>;

const lapsOn = (s: Obj | undefined): number =>
  (s?.TotalLaps ?? 0) - (s?.StartLaps ?? 0);

const sameSet = (a: Obj, b: Obj | undefined) =>
  b !== undefined &&
  a.TotalLaps === b.TotalLaps &&
  a.StartLaps === b.StartLaps &&
  a.New === b.New;

const leftover = ([s, ...rest]: Obj[]) =>
  lapsOn(s) <= 0 ||
  sameSet(
    s!,
    rest.find((n) => lapsOn(n) > 0),
  );

const skip = (stints: Obj[], count: number) => {
  let start = 0;
  while (stints.length - start > count && leftover(stints.slice(start)))
    start++;
  return start;
};

export const towerStints = (
  stints: Obj[],
  line: Obj,
  exits: number[] | null | undefined,
  race: boolean,
) => {
  const laps = Number(line.NumberOfLaps ?? 0);
  const pits = Number(line.NumberOfPitStops ?? 0);
  const from = (k: number) => (k ? (exits?.[k - 1] ?? laps) : 0);
  const derived = (k: number) => (k < pits ? from(k + 1) : laps) - from(k);
  let count = race ? pits + 1 : stints.length;
  let start = race ? skip(stints, count) : 0;
  if (race && exits) {
    if (pits && from(pits) === laps && lapsOn(stints[start + pits]) > 0)
      start = skip(stints, (count = pits));
    const matches = (d: number) =>
      stints.slice(d, d + count - 1).filter((s, k) => lapsOn(s) === derived(k))
        .length;
    for (let d = 0; d + count <= stints.length; d++)
      if (matches(d) > matches(start)) start = d;
  }
  return stints.slice(start, start + count).map((s, k) => {
    const on = race && exits ? derived(k) : Math.max(0, lapsOn(s));
    return {
      compound: s.Compound ?? "",
      age: (s.StartLaps ?? 0) + on,
      laps: on,
      new: s.New === "true",
    };
  });
};
