import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { createServer } from "node:net";
import { join, resolve } from "node:path";
import { createInterface } from "node:readline";
import { test } from "node:test";

for (const host of ["127.0.0.1", "::"])
  test(
    `dev refuses a port held on ${host} before starting either server`,
    { timeout: 10_000 },
    async () => {
      const occupied = createServer();
      occupied.listen(0, host);
      await once(occupied, "listening");
      const address = occupied.address();
      assert.ok(address && typeof address === "object");
      try {
        const child = spawn(process.execPath, ["scripts/dev.ts"], {
          env: { ...process.env, PORT: String(address.port), VITE_PORT: "0" },
          stdio: ["ignore", "ignore", "pipe"],
        });
        let error = "";
        child.stderr.on("data", (data) => {
          error += data;
        });
        const [code] = await once(child, "exit");
        assert.equal(code, 1);
        assert.match(error, /EADDRINUSE/);
      } finally {
        occupied.close();
      }
    },
  );

for (const signal of ["SIGINT", "SIGTERM", null] as const)
  test(
    `dev stops watchers and children after ${signal ?? "a child failure"}`,
    { timeout: 10_000, skip: process.platform === "win32" },
    async () => {
      const root = mkdtempSync(join(tmpdir(), "f1-dev-"));
      const app = join(root, "app.mjs");
      writeFileSync(
        app,
        "console.log(process.pid); setInterval(() => {}, 1000);",
      );
      const commands = [
        ["--watch", app],
        [
          "-e",
          signal
            ? "setInterval(() => {}, 1000)"
            : "setTimeout(() => process.exit(7), 1000)",
        ],
      ];
      const child = spawn(
        process.execPath,
        [
          "--input-type=module",
          "-e",
          `import { runDev } from ${JSON.stringify(resolve("scripts/dev.ts"))}; process.exitCode = await runDev(${JSON.stringify(commands)});`,
        ],
        { stdio: ["ignore", "pipe", "pipe"] },
      );
      const exit = once(child, "exit");
      try {
        const lines = createInterface({ input: child.stdout });
        let appPid = 0;
        for await (const line of lines) {
          if (/^\d+$/.test(line)) {
            appPid = Number(line);
            break;
          }
        }
        assert.ok(appPid);
        if (signal) child.kill(signal);
        const [code] = await exit;
        assert.equal(
          code,
          signal === "SIGINT" ? 130 : signal === "SIGTERM" ? 143 : 7,
        );
        assert.throws(() => process.kill(appPid, 0), { code: "ESRCH" });
      } finally {
        child.kill("SIGTERM");
        await exit;
        rmSync(root, { recursive: true, force: true });
      }
    },
  );
