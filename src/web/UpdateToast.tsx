import { LoaderCircle } from "lucide-react";
import { useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";

const reload = () => location.reload();

const update = async () => {
  const waiting = (await navigator.serviceWorker.getRegistration())?.waiting;
  if (!waiting) return reload();
  waiting.addEventListener("statechange", () => {
    if (["activated", "redundant"].includes(waiting.state)) reload();
  });
  waiting.postMessage({ type: "SKIP_WAITING" });
};

export const UpdateToast = () => {
  const [updating, setUpdating] = useState(false);
  const {
    needRefresh: [needRefresh],
  } = useRegisterSW({
    onRegisteredSW: (_, registration) => {
      if (!registration) return;
      setInterval(() => document.hidden || registration.update(), 60 * 60_000);
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") registration.update();
      });
    },
  });
  if (!needRefresh) return null;
  return (
    <div
      role="status"
      className="motion-safe:animate-toast-in fixed inset-x-[21px] bottom-[calc(21px+62px+12px)] z-20 mx-auto flex items-center justify-between gap-3 rounded-full border border-amber-400/30 bg-amber-950/80 py-2 pr-2 pl-5 text-sm text-amber-100 shadow-lg shadow-amber-950/40 backdrop-blur-xl sm:bottom-6 sm:max-w-sm"
    >
      <span>A new version is available.</span>
      <button
        onClick={() => {
          setUpdating(true);
          update();
        }}
        disabled={updating}
        className="flex cursor-pointer items-center gap-2 rounded-full bg-amber-500 px-4 py-1.5 font-semibold text-zinc-950 hover:bg-amber-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 disabled:cursor-default disabled:opacity-70 disabled:hover:bg-amber-500"
        type="button"
      >
        {updating && <LoaderCircle className="size-4 animate-spin" />}
        Update
      </button>
    </div>
  );
};
