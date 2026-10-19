import assert from "node:assert/strict";
import { mkdtemp, readFile, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

const dir = await mkdtemp(join(tmpdir(), "f1-tokens-"));
process.env.DATA_DIR = dir;
const token = await import("../src/server/token.ts");

const jwt = (claims: object) =>
  `e30.${Buffer.from(JSON.stringify(claims)).toString("base64url")}.sig`;

test("F1TV tokens persist in a file that only the server can read", async () => {
  const value = jwt({ exp: Date.now() / 1000 + 3600 });
  const friend = token.key("friend@example.com");
  const ola = token.key("ola@example.com");
  await writeFile(
    join(dir, "tokens.json"),
    JSON.stringify({ [friend]: value }),
  );
  await token.load();
  assert.equal(token.current(friend), value);

  await token.save(ola, value);

  const saved = JSON.parse(await readFile(join(dir, "tokens.json"), "utf8"));
  assert.deepEqual(saved, { [friend]: value, [ola]: value });
  assert.equal((await stat(join(dir, "tokens.json"))).mode & 0o777, 0o600);
});
