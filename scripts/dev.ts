import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";

async function checkPort(port: number) {
  const server = createServer();
  server.listen(port, "127.0.0.1");
  await once(server, "listening");
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
}

export async function runDev(commands: string[][]): Promise<number> {
  const children = commands.map((args) =>
    spawn(process.execPath, args, {
      stdio: "inherit",
      detached: process.platform !== "win32",
      env: { ...process.env, DEV_NO_AUTH: "1" },
    }),
  );
  let stop: (code: number) => void;
  const stopped = new Promise<number>((resolve) => {
    stop = resolve;
  });
  const interrupt = () => stop(130);
  const terminate = () => stop(143);
  process.once("SIGINT", interrupt);
  process.once("SIGTERM", terminate);
  const exits = children.map((child) =>
    once(child, "exit").then(
      ([code]) => {
        stop(code ?? 1);
      },
      (error) => {
        console.error(error);
        stop(1);
      },
    ),
  );
  const code = await stopped;
  const signal = (value: NodeJS.Signals) => {
    for (const child of children) {
      if (!child.pid) continue;
      try {
        if (process.platform === "win32") child.kill(value);
        else process.kill(-child.pid, value);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ESRCH") throw error;
      }
    }
  };
  signal("SIGTERM");
  const timer = setTimeout(() => signal("SIGKILL"), 2000);
  await Promise.all(exits);
  clearTimeout(timer);
  signal("SIGKILL");
  process.removeListener("SIGINT", interrupt);
  process.removeListener("SIGTERM", terminate);
  return code;
}

if (import.meta.main) {
  await checkPort(Number(process.env.PORT ?? 8787));
  await checkPort(Number(process.env.VITE_PORT ?? 5173));
  process.exitCode = await runDev([
    [
      ...(process.env.DEV_WATCH === "0" ? [] : ["--watch"]),
      "--env-file-if-exists=.env.local",
      "src/server/main.ts",
    ],
    [
      "node_modules/vite/bin/vite.js",
      "--configLoader",
      "native",
      ...process.argv.slice(2),
    ],
  ]);
}
