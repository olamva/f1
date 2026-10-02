import type { LucideIcon } from "lucide-react";
import {
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent,
  type RefObject,
} from "react";

interface TabsProps<T extends string> {
  items: readonly T[];
  value: T | null;
  onChange: (v: T) => void;
  onReselect?: () => void;
  small?: boolean;
  stretch?: boolean;
  labels?: Partial<Record<T, string>>;
  icons?: Partial<Record<T, LucideIcon>>;
  live?: T;
  drive?: RefObject<((offset: number, held: boolean) => void) | null>;
}

export const Tabs = <T extends string>({
  items,
  value,
  onChange,
  onReselect,
  small,
  stretch,
  labels,
  icons,
  live,
  drive,
}: TabsProps<T>) => {
  const nav = useRef<HTMLElement>(null);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const blob = useRef<HTMLSpanElement>(null);
  const drag = useRef<{
    pointerId: number;
    startX: number;
    left: number;
    width: number;
    x: number | null;
  } | null>(null);
  const suppressClick = useRef(false);
  const hold = useRef(0);
  const rest = useRef(0);
  const pull = useRef<number | null>(null);
  const [held, setHeld] = useState(false);
  const [moving, setMoving] = useState(false);
  const [size, setSize] = useState<number | null>(null);
  const [highlight, setHighlight] = useState<{
    left: number;
    width: number;
  } | null>(null);

  const active = held || moving;

  useLayoutEffect(() => {
    const indicator = blob.current;
    if (!active || !indicator) return;
    const ease = (from: number, to: number, elapsed: number, time: number) =>
      from + (to - from) * (1 - Math.exp(-elapsed / time));
    let frame = 0;
    let x = drag.current?.x ?? rest.current;
    let speed = 0;
    let trend = 0;
    let stretch = 0;
    let previous = performance.now();
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const animate = (now: number) => {
      const elapsed = Math.max(1, now - previous);
      const left =
        drag.current?.x ??
        pull.current ??
        (reduced
          ? (drag.current?.left ?? rest.current)
          : ease(x, drag.current?.left ?? rest.current, elapsed, 60));
      speed = ease(speed, Math.abs(left - x) / elapsed, elapsed, 40);
      trend = ease(trend, speed, elapsed, 150);
      stretch = ease(
        stretch,
        Math.max(-0.25, Math.min(0.35, speed * 0.16 + (speed - trend) * 0.3)),
        elapsed,
        25,
      );
      indicator.style.translate = `${left}px`;
      indicator.style.setProperty(
        "--stretch",
        reduced ? "0" : stretch.toFixed(3),
      );
      clip();
      x = left;
      previous = now;
      if (
        !drag.current &&
        pull.current === null &&
        Math.abs(rest.current - left) < 4
      ) {
        setSize(null);
        return setMoving(false);
      }
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(frame);
      indicator.style.removeProperty("--stretch");
    };
  }, [active]);

  useLayoutEffect(() => {
    const track = nav.current;
    const button = buttons.current[items.findIndex((item) => item === value)];
    if (!track || !button) return;
    const measure = () => {
      rest.current = button.offsetLeft;
      setHighlight({ left: rest.current, width: button.offsetWidth });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    observer.observe(button);
    return () => observer.disconnect();
  }, [items, value]);

  useLayoutEffect(() => {
    if (!drive) return;
    drive.current = (offset, hold) => {
      const index = items.findIndex((item) => item === value);
      const from = buttons.current[index];
      const to = buttons.current[index + Math.sign(offset)] ?? from;
      if (!from || !to) return;
      const x =
        from.offsetLeft +
        (to.offsetLeft - from.offsetLeft) * Math.min(1, Math.abs(offset));
      if (hold) {
        pull.current = x;
        if (!held) {
          setHeld(true);
          setMoving(false);
          setSize(from.offsetWidth);
        }
        return;
      }
      pull.current = null;
      rest.current = x;
      setHighlight({ left: x, width: to.offsetWidth });
      setHeld(false);
      setMoving(true);
      setSize(null);
    };
  });

  const clip = () => {
    const indicator = blob.current;
    if (!indicator || !nav.current) return;
    const inner = indicator.getBoundingClientRect();
    for (const layer of nav.current.querySelectorAll<HTMLElement>(
      ".glass-lens",
    )) {
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
  };

  useLayoutEffect(() => {
    const indicator = blob.current;
    if (!indicator) return;
    let frame = 0;
    const follow = () => {
      clip();
      frame =
        active || indicator.getAnimations().length
          ? requestAnimationFrame(follow)
          : 0;
    };
    const start = () => {
      cancelAnimationFrame(frame);
      follow();
    };
    start();
    indicator.addEventListener("transitionrun", start);
    return () => {
      cancelAnimationFrame(frame);
      indicator.removeEventListener("transitionrun", start);
    };
  }, [active, highlight, size]);

  const position = (event: PointerEvent<HTMLElement>) => {
    const current = drag.current!;
    const first = buttons.current[0]!;
    const last = buttons.current[items.length - 1]!;
    return Math.max(
      first.offsetLeft,
      Math.min(
        last.offsetLeft + last.offsetWidth - current.width,
        current.left + event.clientX - current.startX,
      ),
    );
  };

  const shine = (event: PointerEvent<HTMLElement>) => {
    const track = nav.current!;
    const bounds = track.getBoundingClientRect();
    const scale = bounds.width / track.offsetWidth;
    track.style.setProperty(
      "--glass-x",
      `${(event.clientX - bounds.left) / scale}px`,
    );
    track.style.setProperty(
      "--glass-y",
      `${(event.clientY - bounds.top) / scale}px`,
    );
  };

  const content = (i: T) => {
    const Icon: LucideIcon | undefined = icons?.[i];
    return (
      <>
        {live === i && <span aria-hidden="true" className="live-dot" />}
        {Icon && <Icon aria-hidden="true" className="size-5 sm:hidden" />}
        <span className={Icon ? "max-sm:sr-only" : undefined}>
          {labels?.[i] ?? i}
        </span>
      </>
    );
  };

  const lift = () => {
    clearTimeout(hold.current);
    setHeld(true);
    setMoving(false);
    setSize(drag.current!.width);
  };

  const cancelDrag = () => {
    if (!drag.current) return;
    clearTimeout(hold.current);
    drag.current = null;
    setHeld(false);
    setMoving(held);
    setSize(null);
  };

  return (
    <nav
      ref={nav}
      onPointerMove={(event) => {
        shine(event);
        if (drag.current?.pointerId !== event.pointerId) return;
        if (
          !suppressClick.current &&
          Math.abs(event.clientX - drag.current.startX) > 3
        ) {
          suppressClick.current = true;
          lift();
        }
        if (suppressClick.current) drag.current.x = position(event);
      }}
      onPointerUp={(event) => {
        if (drag.current?.pointerId !== event.pointerId) return;
        const center = position(event) + drag.current.width / 2;
        const index = items.reduce((nearest, _, index) => {
          const button = buttons.current[index]!;
          const previous = buttons.current[nearest]!;
          return Math.abs(button.offsetLeft + button.offsetWidth / 2 - center) <
            Math.abs(previous.offsetLeft + previous.offsetWidth / 2 - center)
            ? index
            : nearest;
        }, 0);
        const button = buttons.current[index]!;
        button.focus({ preventScroll: true });
        rest.current = button.offsetLeft;
        const tapped = !suppressClick.current;
        suppressClick.current = true;
        cancelDrag();
        if (held) setSize(button.offsetWidth);
        if (items[index] !== value) onChange(items[index]!);
        else if (tapped) onReselect?.();
      }}
      onPointerCancel={cancelDrag}
      onLostPointerCapture={cancelDrag}
      onKeyDown={(event) => {
        if (event.key === "Escape" && drag.current) {
          suppressClick.current = true;
          cancelDrag();
        }
      }}
      data-held={held}
      data-glass={active}
      data-visible={value !== null}
      className={`glass-tabs relative flex w-fit max-w-full gap-1 p-1 sm:gap-1.5 ${small ? "glass-tabs-small" : "sm:p-1.5"} ${stretch ? "max-sm:w-full" : ""}`}
    >
      {highlight && (
        <span
          ref={blob}
          className="glass-highlight"
          data-visible={value !== null}
          style={{
            width: size ?? highlight.width,
            translate: active ? undefined : `${highlight.left}px`,
          }}
        />
      )}
      {items.map((i, index) => {
        return (
          <button
            key={i}
            ref={(element) => {
              buttons.current[index] = element;
            }}
            onPointerDown={(event) => {
              if (!event.isPrimary || event.button !== 0) return;
              shine(event);
              suppressClick.current = false;
              const button = event.currentTarget;
              drag.current = {
                pointerId: event.pointerId,
                startX: event.clientX,
                left: button.offsetLeft,
                width: button.offsetWidth,
                x: null,
              };
              button.setPointerCapture(event.pointerId);
              if (i === value) hold.current = window.setTimeout(lift, 200);
              else lift();
            }}
            onClick={(event) => {
              if (!suppressClick.current || event.detail === 0) {
                event.currentTarget.focus({ preventScroll: true });
                if (i !== value) {
                  if (!matchMedia("(prefers-reduced-motion: reduce)").matches)
                    setMoving(true);
                  onChange(i);
                } else onReselect?.();
              }
              suppressClick.current = false;
            }}
            type="button"
            aria-pressed={value === i}
            className={`glass-tab relative z-10 flex shrink-0 items-center justify-center capitalize ${stretch ? "max-sm:flex-1" : ""} ${small ? "px-3.5 py-1.5 text-sm" : "px-2 py-2 text-sm font-semibold sm:px-4 sm:text-base"}`}
          >
            {content(i)}
            <span
              aria-hidden="true"
              className="glass-lens pointer-events-none absolute inset-0 flex items-center justify-center"
            >
              {content(i)}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
