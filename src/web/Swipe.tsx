import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { flushSync } from "react-dom";
import { standalone } from "./path.ts";

interface SwipeProps<T extends string> {
  items: readonly T[];
  value: T;
  onChange: (v: T) => void;
  render: (v: T) => ReactNode;
  keep?: readonly T[];
  drive?: RefObject<((offset: number, held: boolean) => void) | null>;
  lift?: RefObject<HTMLElement | null>;
}

const GAP = 32;
const EASE = "translate 250ms cubic-bezier(0.2, 0.8, 0.2, 1)";
const touch = matchMedia("(any-pointer: coarse)").matches;
const Level = createContext({ depth: 0, active: true });
const claimed = new WeakSet<Event>();
let busy = false;
let pending: (() => void) | null = null;
let last = { at: -Infinity, depth: 0 };
const levels = new Set<{ depth: number; move: (step: number) => boolean }>();

export const useActive = () => useContext(Level).active;

const locked = (depth: number) =>
  depth > 0 && !last.depth && performance.now() - last.at < 1000;

addEventListener("keydown", (event) => {
  const step = { ArrowLeft: -1, ArrowRight: 1 }[event.key];
  if (
    !step ||
    event.defaultPrevented ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey ||
    (event.target instanceof Element &&
      event.target.closest("input, select, textarea, [contenteditable]"))
  )
    return;
  [...levels]
    .filter((level) => !locked(level.depth))
    .sort((a, b) => b.depth - a.depth)
    .some((level) => level.move(step));
});

const blocked = (target: EventTarget) => {
  for (
    let el = target instanceof Element ? target : null;
    el && el !== document.body;
    el = el.parentElement
  ) {
    const style = getComputedStyle(el);
    if (
      el.matches("input, select, textarea, nav, [contenteditable]") ||
      style.touchAction === "none" ||
      (/auto|scroll/.test(style.overflowX) && el.scrollWidth > el.clientWidth)
    )
      return true;
  }
  return false;
};

export const Swipe = <T extends string>({
  items,
  value,
  onChange,
  render,
  keep,
  drive,
  lift,
}: SwipeProps<T>) => {
  const { depth, active } = useContext(Level);
  const root = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    id: number;
    x: number;
    y: number;
    at: number;
    dx: number;
    speed: number;
    on: boolean;
  } | null>(null);
  const landing = useRef<number | null>(null);
  const lands = useRef<Record<number, number>>({});
  const head = useRef<DOMRect | null>(null);
  const [previous, setPrevious] = useState(value);
  const [epochs, setEpochs] = useState<Partial<Record<T, number>>>({});
  const index = items.indexOf(value);

  if (previous !== value) {
    setPrevious(value);
    setEpochs((e) => ({ ...e, [previous]: (e[previous] ?? 0) + 1 }));
  }

  const panels = () =>
    [...root.current!.children].filter(
      (panel): panel is HTMLElement =>
        panel instanceof HTMLElement && "side" in panel.dataset,
    );

  const reset = () => {
    const el = root.current!;
    delete el.dataset.swiping;
    delete el.dataset.settling;
    el.style.removeProperty("--swipe");
    for (const panel of el.children) {
      (panel as HTMLElement).style.removeProperty("top");
      (panel as HTMLElement).style.removeProperty("height");
    }
    lift?.current?.style.removeProperty("translate");
    lift?.current?.style.removeProperty("transition");
    busy = false;
  };

  useLayoutEffect(() => {
    if (landing.current === null)
      return root
        .current!.querySelector(":scope > :not([inert]) [data-swipe-anchor]")
        ?.scrollIntoView({ block: "center" });
    const y = landing.current;
    landing.current = null;
    reset();
    scrollTo(0, y);
  }, [value]);

  useEffect(
    () => () => {
      busy = false;
      pending = null;
    },
    [],
  );

  useEffect(() => {
    if (!active) return;
    const level = {
      depth,
      move: (step: number) => {
        const next = items[index + step];
        if (!next || !root.current!.checkVisibility()) return false;
        last = { at: performance.now(), depth };
        drive?.current?.(0, false);
        onChange(next);
        return true;
      },
    };
    levels.add(level);
    return () => void levels.delete(level);
  }, [active, depth, items, index, onChange, drive]);

  const reveal = () => {
    const el = root.current!;
    const tail =
      document.documentElement.scrollHeight -
      scrollY -
      el.getBoundingClientRect().bottom;
    el.dataset.swiping = "";
    const top = el.getBoundingClientRect().top;
    head.current = lift?.current?.getBoundingClientRect() ?? null;
    lands.current = {};
    for (const panel of panels()) {
      const anchor = panel.querySelector("[data-swipe-anchor]");
      const bounds = anchor?.getBoundingClientRect();
      const centered = bounds
        ? innerHeight / 2 -
          top -
          (bounds.top - panel.getBoundingClientRect().top) -
          bounds.height / 2
        : Infinity;
      const room = scrollY + top + panel.offsetHeight + tail - innerHeight;
      const land = Math.max(
        0,
        Math.min(room, scrollY - Math.min(centered, Math.max(0, -top))),
      );
      lands.current[Number(panel.dataset.side)] = land;
      panel.style.top = `${scrollY - land}px`;
    }
    for (const panel of el.children as HTMLCollectionOf<HTMLElement>)
      if (!panel.hidden && !panel.offsetHeight) {
        panel.style.top = `${-top}px`;
        panel.style.height = `${innerHeight}px`;
      }
  };

  const raise = (progress: number, step: number) => {
    const el = lift?.current;
    const from = head.current;
    if (!el || !from) return;
    const clamp = (y: number) => Math.max(-from.bottom + from.top, y);
    const start = clamp(from.top);
    const end = clamp(from.top + scrollY - (lands.current[step] ?? scrollY));
    el.style.translate = `0 ${start + progress * (end - start) - from.top}px`;
  };

  const settle = (step: number) => {
    const el = root.current!;
    const next = step ? items[index + step] : undefined;
    busy = true;
    if (next) last = { at: performance.now(), depth };
    drive?.current?.(next ? step : 0, false);
    el.dataset.settling = "";
    if (lift?.current) lift.current.style.transition = EASE;
    raise(next ? 1 : 0, step);
    el.style.setProperty(
      "--swipe",
      `${next ? -step * (el.offsetWidth + GAP) : 0}px`,
    );
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const done = () => {
      pending = null;
      if (!next) return reset();
      landing.current = lands.current[step] ?? scrollY;
      onChange(next);
    };
    const timer = setTimeout(() => flushSync(done), reduced ? 0 : 250);
    pending = () => {
      clearTimeout(timer);
      flushSync(done);
    };
  };

  const end = (event: PointerEvent) => {
    const current = drag.current;
    if (current?.id !== event.pointerId) return;
    drag.current = null;
    if (!current.on) return;
    if (event.timeStamp - current.at > 100) current.speed = 0;
    const width = root.current!.offsetWidth;
    const step =
      current.dx < -width / 3 || (current.dx < 0 && current.speed < -0.4)
        ? 1
        : current.dx > width / 3 || (current.dx > 0 && current.speed > 0.4)
          ? -1
          : 0;
    settle(event.type === "pointerup" ? step : 0);
  };

  return (
    <div
      ref={root}
      className="swipe"
      onPointerDown={(event) => {
        if (touch && event.pointerType === "touch") pending?.();
        if (
          !touch ||
          busy ||
          event.pointerType !== "touch" ||
          !event.isPrimary ||
          (!standalone &&
            (event.clientX < 20 || event.clientX > innerWidth - 20)) ||
          blocked(event.target)
        )
          return;
        drag.current = {
          id: event.pointerId,
          x: event.clientX,
          y: event.clientY,
          at: event.timeStamp,
          dx: 0,
          speed: 0,
          on: false,
        };
      }}
      onPointerMove={(event) => {
        const current = drag.current;
        if (current?.id !== event.pointerId) return;
        const dx = event.clientX - current.x;
        const dy = event.clientY - current.y;
        if (!current.on) {
          if (Math.abs(dy) > Math.abs(dx)) drag.current = null;
          if (Math.abs(dx) < 10 || !drag.current) return;
          if (
            claimed.has(event.nativeEvent) ||
            (depth && (!items[index + (dx < 0 ? 1 : -1)] || locked(depth)))
          ) {
            drag.current = null;
            return;
          }
          claimed.add(event.nativeEvent);
          current.on = true;
          reveal();
        }
        const elapsed = Math.max(1, event.timeStamp - current.at);
        current.speed = (dx - current.dx) / elapsed;
        current.at = event.timeStamp;
        current.dx = dx;
        const shift = items[index + (dx < 0 ? 1 : -1)] ? dx : 0;
        root.current!.style.setProperty("--swipe", `${shift}px`);
        const offset = -shift / (root.current!.offsetWidth + GAP);
        drive?.current?.(offset, true);
        raise(Math.min(1, Math.abs(offset)), Math.sign(offset));
      }}
      onPointerUp={end}
      onPointerCancel={end}
    >
      {items.map((item, i) => {
        const side = i - index;
        const near = touch && active && Math.abs(side) === 1;
        if (side && !near && !keep?.includes(item)) return null;
        const Panel = depth ? "div" : "main";
        return (
          <Panel
            key={`${item}:${keep?.includes(item) ? 0 : (epochs[item] ?? 0)}`}
            data-side={near ? side : undefined}
            hidden={side !== 0 && !near}
            inert={side !== 0}
            style={{ "--side": side } as CSSProperties}
          >
            <Level.Provider
              value={{ depth: depth + 1, active: active && side === 0 }}
            >
              {render(item)}
            </Level.Provider>
          </Panel>
        );
      })}
    </div>
  );
};
