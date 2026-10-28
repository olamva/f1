import { useSyncExternalStore } from "react";
import { MAX_DELAY_S } from "../shared/settings.ts";
import { save, subscribe } from "./synced.ts";

export const setDelay = (s: number) => save("delay", Math.min(MAX_DELAY_S, s));

export const useDelay = () =>
  useSyncExternalStore(subscribe, () =>
    Math.min(MAX_DELAY_S, Number(localStorage.getItem("delay")) || 0),
  );
