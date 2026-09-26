import { getJson } from "./api.ts";

export type PushState = "unsupported" | "off" | "enabled" | "disabled";

const registration = () => navigator.serviceWorker.ready;

async function send(method: "PUT" | "DELETE", body: unknown) {
  const res = await fetch("/api/push", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error((await res.json()).error);
}

export async function pushState(): Promise<PushState> {
  const worker =
    "PushManager" in window &&
    (await navigator.serviceWorker?.getRegistration());
  if (!worker) return "unsupported";
  const current = await worker.pushManager.getSubscription();
  const { publicKey, enabled } = await getJson<{
    publicKey: string | null;
    enabled: boolean;
  }>(`/api/push?endpoint=${encodeURIComponent(current?.endpoint ?? "")}`);
  return !publicKey ? "off" : enabled ? "enabled" : "disabled";
}

export async function enablePush() {
  if ((await Notification.requestPermission()) !== "granted")
    throw new Error("Allow notifications for this app in the system settings.");
  const { publicKey } = await getJson<{ publicKey: string }>("/api/push");
  const { pushManager } = await registration();
  const subscription =
    (await pushManager.getSubscription()) ??
    (await pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: Uint8Array.fromBase64(publicKey, {
        alphabet: "base64url",
      }),
    }));
  await send("PUT", subscription.toJSON());
}

export async function disablePush() {
  const subscription = await (
    await registration()
  ).pushManager.getSubscription();
  if (!subscription) return;
  await send("DELETE", { endpoint: subscription.endpoint });
  await subscription.unsubscribe();
}
