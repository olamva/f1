import { useRegisterSW } from "virtual:pwa-register/react";

export const UpdateToast = () => {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW: (_, registration) => {
      if (!registration) return;
      setInterval(() => registration.update(), 60 * 60_000);
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
        onClick={() => updateServiceWorker()}
        className="cursor-pointer rounded-full bg-amber-500 px-4 py-1.5 font-semibold text-zinc-950 hover:bg-amber-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
        type="button"
      >
        Update
      </button>
    </div>
  );
};
