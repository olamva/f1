import { createHash } from "node:crypto";
import { readJson, writeJson } from "./data.ts";

const file = (user: string) =>
  `settings/${createHash("sha256").update(user.toLowerCase()).digest("hex")}.json`;

let saving = Promise.resolve();

export const read = async (user: string): Promise<object> =>
  (await readJson(file(user))) ?? {};

export const update = (user: string, patch: object) => {
  const write = async () =>
    writeJson(file(user), { ...(await read(user)), ...patch });
  return (saving = saving.then(write, write));
};
