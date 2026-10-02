import { useSyncExternalStore } from "react";

const MAX_S = 60;
const listeners = new Set<() => void>();

const subscribe = (change: () => void) => {
  listeners.add(change);
  return () => void listeners.delete(change);
};

export const setDelay = (s: number) => {
  localStorage.setItem("delay", String(Math.min(MAX_S, s)));
  listeners.forEach((change) => change());
};

export const useDelay = () =>
  useSyncExternalStore(subscribe, () =>
    Math.min(MAX_S, Number(localStorage.getItem("delay")) || 0),
  );
