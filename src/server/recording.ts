import { readFileSync } from "node:fs";
import { deflateRawSync, gunzipSync } from "node:zlib";
import type { Json } from "../shared/merge.ts";
import { inflate } from "./timing.ts";

export type Line = [t: number, topic: string, data: Json];
type Handle = (topic: string, data: Json, t: number) => void;

const DATE = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d+)?Z?$/;

export const read = (file: string): Line[] =>
  (file.endsWith(".gz") ? gunzipSync(readFileSync(file)) : readFileSync(file))
    .toString("utf8")
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l) as Line);

const shift = (data: Json, ms: number): Json => {
  if (typeof data === "string" && DATE.test(data))
    return `${new Date(Date.parse(`${data.slice(0, 19)}Z`) + ms).toISOString().slice(0, 19)}${data.slice(19)}`;
  if (Array.isArray(data)) return data.map((v) => shift(v, ms));
  if (data && typeof data === "object")
    return Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, shift(v, ms)]),
    );
  return data;
};

const shiftLine = (topic: string, data: Json, ms: number): Json =>
  topic.endsWith(".z")
    ? deflateRawSync(
        JSON.stringify(shift(inflate(data as string), ms)),
      ).toString("base64")
    : shift(data, ms);

export function play(lines: Line[], from: number, handle: Handle) {
  const offset =
    Math.round((Date.now() - (lines[0]?.[0] ?? 0) - from) / 1000) * 1000;
  let i = 0;
  const step = () => {
    for (; i < lines.length && lines[i]![0] + offset <= Date.now(); i++) {
      const [t, topic, data] = lines[i]!;
      handle(topic, shiftLine(topic, data, offset), t + offset);
    }
    if (i < lines.length) setTimeout(step, lines[i]![0] + offset - Date.now());
  };
  step();
}
