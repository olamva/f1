import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
} from "react";

interface SwipeProps<T extends string> {
  items: readonly T[];
  value: T;
  onChange: (v: T) => void;
  render: (v: T) => ReactNode;
  keep?: readonly T[];
  onDrag?: (offset: number, held: boolean) => void;
}

const GAP = 32;
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
  const landing = useRef<number | null>(null);
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
    for (const panel of el.children)
      (panel as HTMLElement).style.removeProperty("top");
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
    el.dataset.swiping = "";
    const top = el.getBoundingClientRect().top;
    for (const panel of panels()) {
      const anchor = panel.querySelector("[data-swipe-anchor]");
      const bounds = anchor?.getBoundingClientRect();
      const centered = bounds
        ? innerHeight / 2 -
          top -
          (bounds.top - panel.getBoundingClientRect().top) -
          bounds.height / 2
        : Infinity;
      panel.style.top = `${Math.min(centered, Math.max(0, -top))}px`;
    }
  };

  const settle = (step: number) => {
    const el = root.current!;
    const next = step ? items[index + step] : undefined;
    busy.current = true;
    onDrag?.(next ? step : 0, false);
    el.dataset.settling = "";
    el.style.setProperty(
      "--swipe",
      `${next ? -step * (el.offsetWidth + GAP) : 0}px`,
    );
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    setTimeout(
      () => {
        if (!next) return reset();
        const panel = panels().find((p) => p.dataset.side === String(step));
        landing.current = scrollY - parseFloat(panel?.style.top || "0");
        onChange(next);
      },
      reduced ? 0 : 250,
    );
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
        const shift = items[index + (dx < 0 ? 1 : -1)] ? dx : dx / 3;
        root.current!.style.setProperty("--swipe", `${shift}px`);
        onDrag?.(-shift / (root.current!.offsetWidth + GAP), true);
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
