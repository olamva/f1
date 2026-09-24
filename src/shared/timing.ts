export type LapRow = { lap: number; t: number; time: string; position: string; gap: string };

export type Point = [t: number, x: number, y: number];

export type Outline = {
  x: number[];
  y: number[];
  rotation: number;
  corners: { number: number; x: number; y: number }[];
};

export type SessionRef = {
  path: string;
  meeting: string;
  country: string;
  name: string;
  start: string;
};

export type Snapshot = {
  mode: "live" | "replay";
  t: number;
  duration: number;
  state: Record<string, unknown>;
};

export type Delta = [topic: string, data: unknown, t: number];

export const lapSeconds = (s: string): number | null => {
  const m = /^(?:(\d+):)?(\d+(?:\.\d+)?)$/.exec(s.trim());
  return m ? Number(m[1] ?? 0) * 60 + Number(m[2]) : null;
};
