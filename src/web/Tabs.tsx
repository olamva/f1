import type { LucideIcon } from "lucide-react";
import { useLayoutEffect, useRef, useState, type PointerEvent } from "react";

interface TabsProps<T extends string> {
  items: readonly T[];
  value: T | null;
  onChange: (v: T) => void;
  small?: boolean;
  labels?: Partial<Record<T, string>>;
  icons?: Partial<Record<T, LucideIcon>>;
  live?: T;
}

export const Tabs = <T extends string>({
  items,
  value,
  onChange,
  small,
  labels,
  icons,
  live,
}: TabsProps<T>) => {
  const nav = useRef<HTMLElement>(null);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const blob = useRef<HTMLSpanElement>(null);
  const drag = useRef<{
    pointerId: number;
    startX: number;
    left: number;
    width: number;
    scrollLeft: number;
    x: number;
  } | null>(null);
  const suppressClick = useRef(false);
  const [dragging, setDragging] = useState(false);
  const [highlight, setHighlight] = useState<{
    left: number;
    width: number;
  } | null>(null);

  useLayoutEffect(() => {
    const indicator = blob.current;
    if (!dragging || !indicator) return;
    const ease = (from: number, to: number, elapsed: number, time: number) =>
      from + (to - from) * (1 - Math.exp(-elapsed / time));
    let frame = 0;
    let x = drag.current?.x ?? 0;
    let speed = 0;
    let trend = 0;
    let stretch = 0;
    let previous = performance.now();
    const animate = (now: number) => {
      const elapsed = Math.max(1, now - previous);
      const left = drag.current?.x ?? x;
      speed = ease(speed, Math.abs(left - x) / elapsed, elapsed, 40);
      trend = ease(trend, speed, elapsed, 150);
      stretch = ease(
        stretch,
        Math.max(-0.25, Math.min(0.35, speed * 0.16 + (speed - trend) * 0.3)),
        elapsed,
        25,
      );
      indicator.style.translate = `${left}px`;
      indicator.style.setProperty("--stretch", stretch.toFixed(3));
      x = left;
      previous = now;
      frame = requestAnimationFrame(animate);
    };
    animate(previous);
    return () => {
      cancelAnimationFrame(frame);
      indicator.style.removeProperty("--stretch");
    };
  }, [dragging]);

  useLayoutEffect(() => {
    const track = nav.current;
    const button = buttons.current[items.findIndex((item) => item === value)];
    if (!track || !button) return;
    const measure = () =>
      setHighlight({ left: button.offsetLeft, width: button.offsetWidth });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    observer.observe(button);
    if (track.scrollWidth > track.clientWidth) {
      track.scrollTo({
        left:
          button.offsetLeft - track.clientWidth / 2 + button.offsetWidth / 2,
        behavior: "smooth",
      });
    }
    return () => observer.disconnect();
  }, [items, value]);

  const position = (event: PointerEvent<HTMLElement>) => {
    const track = nav.current!;
    const current = drag.current!;
    const first = buttons.current[0]!;
    const last = buttons.current[items.length - 1]!;
    return Math.max(
      first.offsetLeft,
      Math.min(
        last.offsetLeft + last.offsetWidth - current.width,
        current.left +
          event.clientX -
          current.startX +
          track.scrollLeft -
          current.scrollLeft,
      ),
    );
  };

  const cancelDrag = () => {
    drag.current = null;
    setDragging(false);
  };

  return (
    <nav
      ref={nav}
      onPointerMove={(event) => {
        if (drag.current?.pointerId !== event.pointerId) return;
        if (Math.abs(event.clientX - drag.current.startX) > 3)
          suppressClick.current = true;
        if (suppressClick.current) {
          drag.current.x = position(event);
          setDragging(true);
        }
      }}
      onPointerUp={(event) => {
        if (drag.current?.pointerId !== event.pointerId) return;
        if (suppressClick.current) {
          const center = position(event) + drag.current.width / 2;
          const index = items.reduce((nearest, _, index) => {
            const button = buttons.current[index]!;
            const previous = buttons.current[nearest]!;
            return Math.abs(
              button.offsetLeft + button.offsetWidth / 2 - center,
            ) <
              Math.abs(previous.offsetLeft + previous.offsetWidth / 2 - center)
              ? index
              : nearest;
          }, 0);
          buttons.current[index]?.focus({ preventScroll: true });
          if (items[index] !== value) onChange(items[index]!);
        }
        cancelDrag();
      }}
      onPointerCancel={cancelDrag}
      onLostPointerCapture={cancelDrag}
      onKeyDown={(event) => {
        if (event.key === "Escape" && drag.current) {
          suppressClick.current = true;
          cancelDrag();
        }
      }}
      data-dragging={dragging}
      className={`glass-tabs relative flex w-fit max-w-full gap-1 p-1 sm:gap-1.5 ${small ? "glass-tabs-small" : "sm:p-1.5"}`}
    >
      {highlight && (
        <span
          ref={blob}
          className="glass-highlight"
          data-visible={value !== null}
          style={{
            width: highlight.width,
            translate: dragging ? undefined : `${highlight.left}px`,
          }}
        />
      )}
      {items.map((i, index) => {
        const Icon: LucideIcon | undefined = icons?.[i];
        return (
          <button
            key={i}
            ref={(element) => {
              buttons.current[index] = element;
            }}
            onPointerDown={(event) => {
              if (!event.isPrimary || event.button !== 0) return;
              suppressClick.current = false;
              if (value !== i) return;
              const button = event.currentTarget;
              drag.current = {
                pointerId: event.pointerId,
                startX: event.clientX,
                left: button.offsetLeft,
                width: button.offsetWidth,
                scrollLeft: nav.current!.scrollLeft,
                x: button.offsetLeft,
              };
              button.setPointerCapture(event.pointerId);
            }}
            onClick={(event) => {
              if (!suppressClick.current || event.detail === 0) {
                event.currentTarget.focus({ preventScroll: true });
                onChange(i);
              }
              suppressClick.current = false;
            }}
            type="button"
            aria-pressed={value === i}
            data-active={value === i}
            className={`glass-tab relative z-10 flex shrink-0 items-center justify-center capitalize ${small ? "px-3.5 py-1.5 text-sm" : "px-2 py-2 text-sm font-semibold sm:px-4 sm:text-base"}`}
          >
            {live === i && <span aria-hidden="true" className="live-dot" />}
            {Icon && <Icon aria-hidden="true" className="size-5 sm:hidden" />}
            <span className={Icon ? "max-sm:sr-only" : undefined}>
              {labels?.[i] ?? i}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
