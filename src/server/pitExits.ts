import type { Event, State } from "./timing.ts";

type Exits = Record<string, number[] | null>;

const step = (was: number[] | null | undefined, line: any, inPit: boolean) => {
  const pits = Number(line.NumberOfPitStops ?? 0);
  let exits = was === undefined ? (pits ? null : []) : was;
  if (exits && inPit && !line.InPit && pits > exits.length)
    exits = [...exits, Number(line.NumberOfLaps ?? 0)];
  return exits && pits > exits.length + (line.InPit ? 1 : 0) ? null : exits;
};

export class PitExits {
  private exits: Exits = {};
  private inPit: Record<string, boolean> = {};

  see(e: Event, state: State): Exits | null {
    if (e.topic !== "TimingData") return null;
    const lines = (state.TimingData as any)?.Lines ?? {};
    const out: Exits = {};
    for (const n of Object.keys((e.data as any)?.Lines ?? {})) {
      const line = lines[n] ?? {};
      const exits = step(this.exits[n], line, !!this.inPit[n]);
      this.inPit[n] = !!line.InPit;
      if (exits !== this.exits[n]) out[n] = this.exits[n] = exits;
    }
    return Object.keys(out).length ? out : null;
  }
}
