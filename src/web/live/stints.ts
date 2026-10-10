type Obj = Record<string, any>;

const lapsOn = (s: Obj): number => (s.TotalLaps ?? 0) - (s.StartLaps ?? 0);

const sameSet = (a: Obj, b: Obj | undefined) =>
  b !== undefined &&
  a.TotalLaps === b.TotalLaps &&
  a.StartLaps === b.StartLaps &&
  a.New === b.New;

const leftover = ([s, ...rest]: Obj[]) =>
  lapsOn(s!) <= 0 ||
  sameSet(
    s!,
    rest.find((n) => lapsOn(n) > 0),
  );

const raceStints = (stints: Obj[], pits: number): Obj[] => {
  let start = 0;
  while (stints.length - start > pits + 1 && leftover(stints.slice(start)))
    start++;
  return stints.slice(start, start + pits + 1);
};

export const towerStints = (stints: Obj[], pits: number, race: boolean) =>
  (race ? raceStints(stints, pits) : stints).map((s) => ({
    compound: s.Compound ?? "",
    age: s.TotalLaps ?? 0,
    laps: Math.max(0, lapsOn(s)),
    new: s.New === "true",
  }));
