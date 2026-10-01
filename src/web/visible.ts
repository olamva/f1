import { useSyncExternalStore } from "react";

const subscribe = (change: () => void) => {
  document.addEventListener("visibilitychange", change);
  return () => document.removeEventListener("visibilitychange", change);
};

export const useVisible = () =>
  useSyncExternalStore(subscribe, () => !document.hidden);
