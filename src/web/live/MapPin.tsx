import type { ComponentProps } from "react";

export type Frame = readonly [number, number, number, number];

export const CAR: Frame = [-28, -28, 46, 46];
export const RING: Frame = [-24, -24, 48, 48];
export const tag = (extra: number): Frame => [-96 - extra, -58, 74 + extra, 36];

type MapPinProps = ComponentProps<"div"> & { frame: Frame };

export const MapPin = ({ frame, children, ...props }: MapPinProps) => (
  <div {...props}>
    <svg
      viewBox={frame.join(" ")}
      className="block size-full *:pointer-events-auto"
    >
      {children}
    </svg>
  </div>
);
