import { useLayoutEffect, useRef, type RefObject } from "react";
import { positionsAt, type PositionTrail } from "./useFeed.ts";

const MESSAGE_GAP = 1200;
const TICK_SLACK = 350;
const SMOOTHING = 1000;
const TAPS = [-4, -3, -2, -1, 0, 1, 2, 3, 4].map((k) => (k * SMOOTHING) / 8);

interface Motion {
  positions: Record<string, [number, number]> | undefined;
  positionTrail: PositionTrail | undefined;
  time: number;
  speed: number;
  stream: string | undefined;
  ghost: (
    positions: Record<string, [number, number]>,
  ) => Record<string, [number, number]>;
}

export const useCarMotion = (
  svg: RefObject<SVGSVGElement | null>,
  project: ((x: number, y: number) => [number, number]) | null,
  { positions, positionTrail, time, speed, stream, ghost }: Motion,
) => {
  const motion = useRef({
    stream,
    speed,
    offset: 0,
    trail: [] as PositionTrail,
  });
  useLayoutEffect(() => {
    if (speed <= 1) return;
    const m = motion.current;
    const offset = time - performance.now() * speed;
    if (
      m.stream !== stream ||
      !m.trail.length ||
      Math.abs(offset - m.offset) > 1000 * speed
    )
      motion.current = {
        stream,
        speed,
        offset,
        trail: [[time, positions ?? {}]],
      };
    else {
      m.offset += (offset - m.offset) / 5;
      m.trail.push(...(positionTrail ?? []));
    }
  }, [time, stream, positionTrail]);
  useLayoutEffect(() => {
    if (!project || speed <= 1) return;
    let frame = 0;
    const draw = () => {
      const m = motion.current;
      const clock =
        m.offset +
        performance.now() * m.speed -
        MESSAGE_GAP -
        SMOOTHING / 2 -
        TICK_SLACK * m.speed;
      m.trail.splice(
        0,
        m.trail.findLastIndex(([t]) => t <= clock - SMOOTHING / 2),
      );
      const taps = TAPS.map((k) => ghost(positionsAt(m.trail, clock + k)));
      for (const car of svg.current!.querySelectorAll<SVGGElement>(
        "g[data-number]",
      )) {
        const points = taps.flatMap((at) => {
          const p = at[car.dataset.number!];
          return p ? [p] : [];
        });
        if (!points.length) continue;
        const mean = (i: 0 | 1) =>
          points.reduce((sum, p) => sum + p[i], 0) / points.length;
        const [x, y] = project(mean(0), mean(1));
        car.style.transform = `translate(${x}px, ${y}px)`;
      }
      frame = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(frame);
  });
};
