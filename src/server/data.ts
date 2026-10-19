import { randomUUID } from "node:crypto";
import {
  mkdir,
  readdir,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { dirname } from "node:path";

export const DATA_DIR = process.env.DATA_DIR;

const missing = (e: NodeJS.ErrnoException) =>
  e.code === "ENOENT" ? null : Promise.reject(e);

export const readJson = async (path: string): Promise<any> =>
  readFile(`${DATA_DIR}/${path}`, "utf8").then(JSON.parse, missing);

export async function writeJson(path: string, value: unknown) {
  const file = `${DATA_DIR}/${path}`;
  const temp = `${file}.${randomUUID()}`;
  await mkdir(dirname(file), { recursive: true });
  await writeFile(temp, JSON.stringify(value), { mode: 0o600 });
  await rename(temp, file);
}

export const remove = (path: string) =>
  rm(`${DATA_DIR}/${path}`, { force: true });

export const list = async (dir: string): Promise<string[]> =>
  (
    (await readdir(`${DATA_DIR}/${dir}`, { recursive: true }).catch(missing)) ??
    []
  )
    .filter((name) => name.endsWith(".json"))
    .map((name) => `${dir}/${name}`);
