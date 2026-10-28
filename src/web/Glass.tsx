import { useId, useLayoutEffect, type RefObject } from "react";

export const refract = (
  track: HTMLElement,
  indicator: HTMLElement,
  inset: number,
) => {
  const inner = indicator.getBoundingClientRect();
  const bar = track.getBoundingClientRect();
  const width = indicator.offsetWidth;
  const height = indicator.offsetHeight;
  const measure = (el: HTMLElement) => {
    const outer = el.getBoundingClientRect();
    return { el, outer, scale: outer.width / el.offsetWidth };
  };
  const lenses = [...track.querySelectorAll<HTMLElement>(".glass-lens")].map(
    measure,
  );
  const labels = [
    track,
    ...track.querySelectorAll<HTMLElement>(".glass-label"),
  ].map(measure);
  for (const { el, outer, scale } of lenses)
    el.style.clipPath = `inset(${[
      inner.top - outer.top,
      outer.right - inner.right,
      outer.bottom - inner.bottom,
      inner.left - outer.left,
    ]
      .map((edge) => `${Math.max(0, edge / scale)}px`)
      .join(" ")} round 9999px)`;
  for (const { el, outer, scale } of labels) {
    const top = (inner.top - outer.top) / scale;
    const bottom = (inner.bottom - outer.top) / scale;
    const radius = (bottom - top) / 2;
    const left = (inner.left - outer.left) / scale + radius;
    const right = (inner.right - outer.left) / scale - radius;
    el.style.setProperty(
      "--hole",
      `path(evenodd, "M-9999 -9999H9999V9999H-9999Z M${left} ${top}H${right}A${radius} ${radius} 0 0 1 ${right} ${bottom}H${left}A${radius} ${radius} 0 0 1 ${left} ${top}Z")`,
    );
  }
  const lift = inner.height / height;
  const spread = inner.width / width;
  const radius = Math.min(width, height) / 2;
  const bend = height * 0.055;
  const run = height * 0.13;
  const clamp = (value: number, min: number, max: number) =>
    Math.max(min, Math.min(max, value));
  const rx = bar.height / 2 / spread - inset;
  const ry = bar.height / 2 / lift - inset;
  const middle = (bar.top + bar.height / 2 - inner.top) / lift;
  const start = (bar.left + bar.height / 2 - inner.left) / spread;
  const end = (bar.right - bar.height / 2 - inner.left) / spread;
  const outline = [1, -1].flatMap((side) => {
    const [from, to] = side > 0 ? [start, end] : [end, start];
    const a = clamp(from, -2, width + 2);
    const b = clamp(to, -2, width + 2);
    const steps = Math.max(1, Math.ceil(Math.abs(b - a)));
    return [
      ...Array.from({ length: steps }, (_, i) => [
        a + ((b - a) * i) / steps,
        middle - side * ry,
        0,
        -side,
      ]),
      ...Array.from({ length: 33 }, (_, i) => {
        const angle = (Math.PI * i) / 32 - Math.PI / 2;
        const nx = side * Math.cos(angle);
        const ny = side * Math.sin(angle);
        return [clamp(to + rx * nx, -2, width + 2), middle + ry * ny, nx, ny];
      }),
    ];
  });
  const count = outline.length;
  const gap = outline.map(
    ([x, y]) =>
      8 *
      Math.max(
        0,
        radius -
          Math.hypot(
            x - clamp(x, radius, width - radius),
            y - clamp(y, radius, height - radius),
          ),
      ),
  );
  const step = outline.map(([x, y], i) =>
    Math.hypot(x - outline.at(i - 1)![0], y - outline.at(i - 1)![1]),
  );
  for (let i = 1; i < 2 * count; i++)
    gap[i % count] = Math.min(
      gap[i % count],
      gap[(i - 1) % count] + step[i % count],
    );
  for (let i = 2 * count - 1; i > 0; i--)
    gap[(i - 1) % count] = Math.min(
      gap[(i - 1) % count],
      gap[i % count] + step[i % count],
    );
  const edges = `M${outline
    .map(([x, y, nx, ny], i) => {
      const t = Math.min(1, gap[i] / run);
      const shift = bend * t * t * (3 - 2 * t);
      return `${(x - nx * shift).toFixed(2)} ${(y - ny * shift).toFixed(2)}`;
    })
    .join("L")}Z`;
  for (const path of indicator.querySelectorAll(".glass-edge"))
    path.setAttribute("d", edges);
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

export const GlassSlab = () => {
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
      </defs>
      <path className="glass-edge" />
      <g mask={`url(#${id})`} filter={`url(#${id}-blur)`}>
        <path className="glass-edge glass-split" />
        <path className="glass-edge glass-split" />
      </g>
    </svg>
  );
};
