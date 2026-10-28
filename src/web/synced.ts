import { SYNCED } from "../shared/settings.ts";

const listeners = new Set<() => void>();
let queue = Promise.resolve();
let edits = 0;

export const subscribe = (change: () => void) => {
  listeners.add(change);
  return () => void listeners.delete(change);
};

const write = (settings: Record<string, unknown>) => {
  for (const [key, value] of Object.entries(settings))
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  listeners.forEach((change) => change());
};

const send = (settings: Record<string, unknown>) =>
  fetch("/api/settings", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings),
  });

const enqueue = (task: () => Promise<unknown>) => {
  queue = queue.then(task).then(
    () => undefined,
    () => undefined,
  );
};

export const save = (key: string, value: unknown) => {
  edits++;
  write({ [key]: value });
  enqueue(() => send({ [key]: value }));
};

export const pull = () =>
  enqueue(async () => {
    const at = edits;
    const res = await fetch("/api/settings");
    if (!res.ok) return;
    const saved = await res.json();
    if (edits !== at) return;
    write(saved);
    const local = SYNCED.filter(
      (key) => !(key in saved) && localStorage.getItem(key) !== null,
    );
    if (local.length)
      await send(
        Object.fromEntries(
          local.map((key) => [key, JSON.parse(localStorage.getItem(key)!)]),
        ),
      );
  });
