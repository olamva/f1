import { useId, useLayoutEffect, type RefObject } from "react";

export const refract = (
  track: HTMLElement,
  indicator: HTMLElement,
  inset: number,
) => {
  const inner = indicator.getBoundingClientRect();
  for (const layer of track.querySelectorAll<HTMLElement>(".glass-lens")) {
    const base = layer.parentElement!.getBoundingClientRect();
    const zoom = base.width / layer.offsetWidth;
    layer.style.transformOrigin = `${(inner.left + inner.width / 2 - base.left) / zoom}px ${(inner.top + inner.height / 2 - base.top) / zoom}px`;
    const outer = layer.getBoundingClientRect();
    const scale = outer.width / layer.offsetWidth;
    layer.style.clipPath = `inset(${[
      inner.top - outer.top,
      outer.right - inner.right,
      outer.bottom - inner.bottom,
      inner.left - outer.left,
    ]
      .map((edge) => `${Math.max(0, edge / scale)}px`)
      .join(" ")} round 9999px)`;
  }
  for (const label of [
    track,
    ...track.querySelectorAll<HTMLElement>(".glass-label"),
  ]) {
    const outer = label.getBoundingClientRect();
    const scale = outer.width / label.offsetWidth;
    const top = (inner.top - outer.top) / scale;
    const bottom = (inner.bottom - outer.top) / scale;
    const radius = (bottom - top) / 2;
    const left = (inner.left - outer.left) / scale + radius;
    const right = (inner.right - outer.left) / scale - radius;
    label.style.setProperty(
      "--hole",
      `path(evenodd, "M-9999 -9999H9999V9999H-9999Z M${left} ${top}H${right}A${radius} ${radius} 0 0 1 ${right} ${bottom}H${left}A${radius} ${radius} 0 0 1 ${left} ${top}Z")`,
    );
  }
  const bar = track.getBoundingClientRect();
  const width = indicator.offsetWidth;
  const height = indicator.offsetHeight;
  const lift = inner.height / height;
  const spread = inner.width / width;
  const radius = height / 2;
  const run = height * 0.13;
  const edge = (depth: number, sign: number) => {
    const y = sign > 0 ? depth : height - depth;
    const x =
      radius - Math.sqrt(Math.max(0, radius ** 2 - (radius - depth) ** 2));
    const shift = sign * Math.max(0, Math.min(height * 0.055, depth));
    return `M-1 ${y}H${x}C${x + run / 2} ${y} ${x + run / 2} ${y + shift} ${x + run} ${y + shift}H${width - x - run}C${width - x - run / 2} ${y + shift} ${width - x - run / 2} ${y} ${width - x} ${y}H${width + 1}V${height + 1}H-1Z`;
  };
  const edges =
    edge((bar.top - inner.top) / lift + inset, 1) +
    edge((inner.bottom - bar.bottom) / lift + inset, -1);
  for (const path of indicator.querySelectorAll(".glass-edge"))
    path.setAttribute("d", edges);
  const end = indicator.querySelector(".glass-bar");
  for (const [name, value] of Object.entries({
    x: (bar.left - inner.left) / spread,
    y: (bar.top - inner.top) / lift,
    width: bar.width / spread,
    height: bar.height / lift,
    rx: bar.height / 2 / spread,
    ry: bar.height / 2 / lift,
  }))
    end?.setAttribute(name, String(value));
};

export const useRefraction = (
  track: RefObject<HTMLElement | null>,
  indicator: RefObject<HTMLElement | null>,
  active: boolean,
  inset: number,
  deps: unknown[],
) =>
  useLayoutEffect(() => {
    const bar = track.current;
    const bubble = indicator.current;
    if (!bar || !bubble) return;
    let frame = 0;
    const follow = () => {
      refract(bar, bubble, inset);
      frame =
        active || bubble.getAnimations().length
          ? requestAnimationFrame(follow)
          : 0;
    };
    const start = () => {
      cancelAnimationFrame(frame);
      follow();
    };
    start();
    bubble.addEventListener("transitionrun", start);
    return () => {
      cancelAnimationFrame(frame);
      bubble.removeEventListener("transitionrun", start);
    };
  }, [active, ...deps]);

interface GlassSlabProps {
  clip?: boolean;
}

export const GlassSlab = ({ clip }: GlassSlabProps) => {
  const id = `glass${useId().replace(/\W/g, "")}`;
  return (
    <svg aria-hidden="true" className="glass-slab">
      <defs>
        <linearGradient id={`${id}-ends`}>
          <stop offset="0" stopColor="white" />
          <stop offset="0.25" stopColor="white" stopOpacity="0" />
          <stop offset="0.75" stopColor="white" stopOpacity="0" />
          <stop offset="1" stopColor="white" />
        </linearGradient>
        <mask id={id} maskContentUnits="objectBoundingBox">
          <rect width="1" height="1" fill={`url(#${id}-ends)`} />
        </mask>
        <filter id={`${id}-blur`}>
          <feGaussianBlur stdDeviation="0.7" />
        </filter>
        {clip && (
          <clipPath id={`${id}-bar`}>
            <rect className="glass-bar" />
          </clipPath>
        )}
      </defs>
      <g clipPath={clip ? `url(#${id}-bar)` : undefined}>
        <path className="glass-edge" />
        <g mask={`url(#${id})`} filter={`url(#${id}-blur)`}>
          <path className="glass-edge glass-split" />
          <path className="glass-edge glass-split" />
        </g>
      </g>
    </svg>
  );
};
