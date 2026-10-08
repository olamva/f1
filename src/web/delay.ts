import { useSyncExternalStore } from "react";

export const MAX_DELAY_S = 300;
const listeners = new Set<() => void>();

const subscribe = (change: () => void) => {
  listeners.add(change);
  return () => void listeners.delete(change);
};

export const setDelay = (s: number) => {
  localStorage.setItem("delay", String(Math.min(MAX_DELAY_S, s)));
  listeners.forEach((change) => change());
};

export const useDelay = () =>
  useSyncExternalStore(subscribe, () =>
    Math.min(MAX_DELAY_S, Number(localStorage.getItem("delay")) || 0),
  );
