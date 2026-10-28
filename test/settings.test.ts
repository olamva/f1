import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { validSettings } from "../src/shared/settings.ts";

process.env.DATA_DIR = await mkdtemp(join(tmpdir(), "f1-settings-"));
const settings = await import("../src/server/settings.ts");

test("a change from one device keeps the other settings of that user only", async () => {
  const norris = { id: "norris", code: "NOR" };
  await Promise.all([
    settings.update("ola@example.com", { delay: 12 }),
    settings.update("Ola@example.com", { favourite: norris }),
    settings.update("friend@example.com", { delay: 3 }),
  ]);
  assert.deepEqual(await settings.read("ola@example.com"), {
    delay: 12,
    favourite: norris,
  });
  assert.deepEqual(await settings.read("friend@example.com"), { delay: 3 });
  assert.deepEqual(await settings.read("new@example.com"), {});
});

test("the server accepts only the synced settings with valid values", () => {
  for (const patch of [
    {},
    { delay: 0 },
    { delay: 300, favourite: null },
    { favourite: { id: "max_verstappen", code: "VER" } },
  ])
    assert.equal(validSettings(patch), true, JSON.stringify(patch));
  for (const patch of [
    null,
    [],
    { delay: -1 },
    { delay: 301 },
    { delay: "5" },
    { autoplay: true },
    { favourite: { id: "norris" } },
    { favourite: { id: "norris", code: "NOR", name: "Lando" } },
    JSON.parse('{"__proto__": {"delay": 1}}'),
  ])
    assert.equal(validSettings(patch), false, JSON.stringify(patch));
});
