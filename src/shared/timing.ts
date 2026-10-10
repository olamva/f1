export type LapRow = {
  lap: number;
  t: number;
  time: string;
  position: string;
  gap: string;
  sectors: string[];
  compound: string;
  pit?: "in" | "out";
};

export type Period = {
  kind: "sc" | "vsc" | "red";
  from: number;
  to: number | null;
};

export type Point = [t: number, x: number, y: number];

export type Telemetry = [
  speed: number,
  gear: number,
  throttle: number,
  brake: number,
];

export type PitLoss = Record<"normal" | "sc" | "vsc", number>;

export type Outline = {
  x: number[];
  y: number[];
  time: number[];
  rotation: number;
  corners: { number: number; x: number; y: number }[];
  sectors: { x: number; y: number }[];
  detection: { x: number; y: number } | null;
  pit: { x: number[]; y: number[] } | null;
  marshalSectors: { number: number; x: number; y: number }[];
  pitLoss?: PitLoss;
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
  now?: number;
  since?: number;
  start?: number;
  duration: number;
  state: Record<string, unknown>;
};

export type Delta = [topic: string, data: unknown, t: number];

export const isRace = (info: Record<string, any> | undefined): boolean =>
  /Race|Sprint$/.test(info?.Type ?? "") || info?.Name === "Sprint";

export const lapSeconds = (s: string): number | null => {
  const m = /^(?:(\d+):)?(\d+(?:\.\d+)?)$/.exec(s.trim());
  return m ? Number(m[1] ?? 0) * 60 + Number(m[2]) : null;
};
