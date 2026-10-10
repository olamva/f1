import { useEffect, useSyncExternalStore } from "react";

const subscribe = (change: () => void) => {
  document.addEventListener("visibilitychange", change);
  return () => document.removeEventListener("visibilitychange", change);
};

export const useVisible = () =>
  useSyncExternalStore(subscribe, () => !document.hidden);

export const useAwake = () => {
  const visible = useVisible();
  useEffect(() => {
    if (!visible || !navigator.wakeLock) return;
    let lock: Promise<WakeLockSentinel | void> | undefined;
    const request = () => {
      lock ??= navigator.wakeLock.request("screen").then(
        (l) => ((l.onrelease = () => (lock = undefined)), l),
        () => void (lock = undefined),
      );
    };
    request();
    addEventListener("pointerup", request);
    return () => {
      removeEventListener("pointerup", request);
      void lock?.then((l) => l?.release());
    };
  }, [visible]);
};
