import { useSyncExternalStore } from "react";

const listeners = new Set<() => void>();

const subscribe = (change: () => void) => {
  listeners.add(change);
  return () => void listeners.delete(change);
};

export const setTokenHidden = (hidden: boolean) => {
  if (hidden) localStorage.setItem("tokenHidden", "1");
  else localStorage.removeItem("tokenHidden");
  listeners.forEach((change) => change());
};

export const useTokenHidden = () =>
  useSyncExternalStore(
    subscribe,
    () => localStorage.getItem("tokenHidden") === "1",
  );
