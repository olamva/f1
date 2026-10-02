import {
  appendFileSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname } from "node:path";
import { gzipSync } from "node:zlib";
import { Feed } from "../src/server/live.ts";
import * as token from "../src/server/token.ts";
import type { Json } from "../src/shared/merge.ts";

const [file = "", until = ""] = process.argv.slice(2);
const end = Date.parse(until);
if (!file.endsWith(".jsonl") || Number.isNaN(end))
  throw new Error("Use pnpm record <file.jsonl> <until ISO time>.");

class Recorder extends Feed {
  protected handle(topic: string, data: Json, now = Date.now()) {
    appendFileSync(file, `${JSON.stringify([now, topic, data])}\n`);
    super.handle(topic, data, now);
  }
}

mkdirSync(dirname(file), { recursive: true });
await token.load();
const key = token.keys().find((k) => token.current(k)) ?? null;
console.log(
  `recording ${key ? "with" : "without"} car positions until ${new Date(end).toISOString()}`,
);
new Recorder(key).start();
setTimeout(() => {
  writeFileSync(`${file}.gz`, gzipSync(readFileSync(file)));
  rmSync(file);
  process.exit(0);
}, end - Date.now());
