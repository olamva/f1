import {
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

interface SwipeProps<T extends string> {
  items: readonly T[];
  value: T;
  onChange: (v: T) => void;
  render: (v: T) => ReactNode;
  keep?: readonly T[];
  onDrag?: (offset: number, held: boolean) => void;
  lift?: RefObject<HTMLElement | null>;
}

const GAP = 32;
const EASE = "translate 250ms cubic-bezier(0.2, 0.8, 0.2, 1)";
const touch = matchMedia("(any-pointer: coarse)").matches;

const blocked = (target: EventTarget, root: HTMLElement) => {
  for (
    let el = target instanceof Element ? target : null;
    el && el !== root;
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
  onDrag,
  lift,
}: SwipeProps<T>) => {
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
  const busy = useRef(false);
  const pending = useRef<(() => void) | null>(null);
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
    busy.current = false;
  };

  useLayoutEffect(() => {
    if (landing.current === null)
      return root
        .current!.querySelector(
          ":scope > main:not([inert]) [data-swipe-anchor]",
        )
        ?.scrollIntoView({ block: "center" });
    const y = landing.current;
    landing.current = null;
    reset();
    scrollTo(0, y);
  }, [value]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const step = { ArrowLeft: -1, ArrowRight: 1 }[event.key];
      const next = step && items[index + step];
      if (
        !next ||
        event.defaultPrevented ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        (event.target instanceof Element &&
          event.target.closest("input, select, textarea, [contenteditable]"))
      )
        return;
      onChange(next);
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [items, index, onChange]);

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
    busy.current = true;
    onDrag?.(next ? step : 0, false);
    el.dataset.settling = "";
    if (lift?.current) lift.current.style.transition = EASE;
    raise(next ? 1 : 0, step);
    el.style.setProperty(
      "--swipe",
      `${next ? -step * (el.offsetWidth + GAP) : 0}px`,
    );
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const done = () => {
      pending.current = null;
      if (!next) return reset();
      landing.current = lands.current[step] ?? scrollY;
      onChange(next);
    };
    const timer = setTimeout(done, reduced ? 0 : 250);
    pending.current = () => {
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
        if (touch && event.pointerType === "touch") pending.current?.();
        if (
          !touch ||
          busy.current ||
          event.pointerType !== "touch" ||
          !event.isPrimary ||
          event.clientX < 20 ||
          event.clientX > innerWidth - 20 ||
          blocked(event.target, root.current!)
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
        onDrag?.(offset, true);
        raise(Math.min(1, Math.abs(offset)), Math.sign(offset));
      }}
      onPointerUp={end}
      onPointerCancel={end}
    >
      {items.map((item, i) => {
        const side = i - index;
        const near = touch && Math.abs(side) === 1;
        if (side && !near && !keep?.includes(item)) return null;
        return (
          <main
            key={`${item}:${keep?.includes(item) ? 0 : (epochs[item] ?? 0)}`}
            data-side={near ? side : undefined}
            hidden={side !== 0 && !near}
            inert={side !== 0}
            style={{ "--side": side } as CSSProperties}
          >
            {render(item)}
          </main>
        );
      })}
    </div>
  );
};
