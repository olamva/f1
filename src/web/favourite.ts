import { useSyncExternalStore } from "react";
import type { DriverInfo } from "../shared/season.ts";

export type Favourite = Pick<DriverInfo, "id" | "code">;

const listeners = new Set<() => void>();

const subscribe = (change: () => void) => {
  listeners.add(change);
  return () => void listeners.delete(change);
};

export const setFavourite = (driver: Favourite | null) => {
  if (driver)
    localStorage.setItem(
      "favourite",
      JSON.stringify({ id: driver.id, code: driver.code }),
    );
  else localStorage.removeItem("favourite");
  listeners.forEach((change) => change());
};

export const useFavourite = (): Favourite | null =>
  JSON.parse(
    useSyncExternalStore(subscribe, () => localStorage.getItem("favourite")) ??
      "null",
  );

export const FAVOURITE_ROW = "bg-red-600/15";
