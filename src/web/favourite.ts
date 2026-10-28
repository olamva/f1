import { useSyncExternalStore } from "react";
import type { DriverInfo } from "../shared/season.ts";
import { save, subscribe } from "./synced.ts";

export type Favourite = Pick<DriverInfo, "id" | "code">;

export const setFavourite = (driver: Favourite | null) =>
  save("favourite", driver && { id: driver.id, code: driver.code });

export const useFavourite = (): Favourite | null =>
  JSON.parse(
    useSyncExternalStore(subscribe, () => localStorage.getItem("favourite")) ??
      "null",
  );

export const FAVOURITE_ROW = "bg-red-600/15";
