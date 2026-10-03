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
    if (!visible) return;
    const lock = navigator.wakeLock?.request("screen").catch(() => null);
    return () => void lock?.then((l) => l?.release());
  }, [visible]);
};
