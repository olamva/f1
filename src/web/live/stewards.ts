import { values } from "./view.ts";

type Obj = Record<string, any>;

type Calls = { investigation?: string; penalty?: string };

const said = (verdict: string, reason = "") => {
  const text = `${verdict.replace(" SECOND ", " S ")}${reason && `: ${reason}`}`;
  return text[0] + text.slice(1).toLowerCase();
};

export const stewards = (state: Obj): Map<string, Calls> => {
  let open: { cars: string[]; title: string }[] = [];
  const penalties = new Map<string, string>();
  for (const m of values(state.RaceControlMessages?.Messages)) {
    const text = String(m.Message ?? "");
    const cars = [...text.matchAll(/(\d{1,2}) \([A-Z]{3}\)/g)].map(
      (c) => c[1]!,
    );
    const reason = / - (.+?)(?: \(\d\d:\d\d:\d\d\))?\s*$/.exec(text)?.[1];
    const probe = /UNDER INVESTIGATION|WILL BE INVESTIGATED AFTER THE \w+/.exec(
      text,
    )?.[0];
    const verdict = /^FIA STEWARDS: ([\w -]+) FOR CARS? /.exec(text)?.[1];
    const served = text.startsWith("FIA STEWARDS: PENALTY SERVED");
    if (probe) open.push({ cars, title: said(probe, reason) });
    else if (!served && (verdict || /NO FURTHER|^BLACK AND WHITE/.test(text)))
      open = open.filter((o) => !o.cars.some((n) => cars.includes(n)));
    for (const n of cars)
      if (served) penalties.delete(n);
      else if (verdict?.endsWith("PENALTY"))
        penalties.set(n, said(verdict, reason));
  }
  const calls = new Map<string, Calls>();
  for (const { cars, title } of open)
    for (const n of cars) calls.set(n, { investigation: title });
  for (const [n, penalty] of penalties)
    calls.set(n, { ...calls.get(n), penalty });
  return calls;
};
