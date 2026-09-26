import { useLayoutEffect, useRef, useState, type PointerEvent } from "react";

interface TabsProps<T extends string> {
  items: readonly T[];
  value: T | null;
  onChange: (v: T) => void;
  small?: boolean;
  labels?: Partial<Record<T, string>>;
  live?: T;
}

export const Tabs = <T extends string>({
  items,
  value,
  onChange,
  small,
  labels,
  live,
}: TabsProps<T>) => {
  const nav = useRef<HTMLElement>(null);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const drag = useRef<{
    pointerId: number;
    startX: number;
    left: number;
    width: number;
    scrollLeft: number;
  } | null>(null);
  const suppressClick = useRef(false);
  const [dragLeft, setDragLeft] = useState<number | null>(null);
  const [highlight, setHighlight] = useState<{
    left: number;
    width: number;
  } | null>(null);

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
    setDragLeft(null);
  };

  return (
    <nav
      ref={nav}
      onPointerMove={(event) => {
        if (drag.current?.pointerId !== event.pointerId) return;
        if (Math.abs(event.clientX - drag.current.startX) > 3)
          suppressClick.current = true;
        if (suppressClick.current) setDragLeft(position(event));
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
      data-dragging={dragLeft !== null}
      className={`glass-tabs relative flex w-fit max-w-full gap-1 p-1 sm:gap-1.5 ${small ? "glass-tabs-small" : "sm:p-1.5"}`}
    >
      {highlight && (
        <span
          className="glass-highlight"
          data-visible={value !== null}
          style={{
            width: highlight.width,
            transform: `translateX(${dragLeft ?? highlight.left}px)`,
          }}
        />
      )}
      {items.map((i, index) => (
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
            };
            button.setPointerCapture(event.pointerId);
          }}
          onClick={(event) => {
            if (!suppressClick.current || event.detail === 0) onChange(i);
            suppressClick.current = false;
          }}
          type="button"
          aria-pressed={value === i}
          data-active={value === i}
          className={`glass-tab relative z-10 shrink-0 capitalize ${small ? "px-3.5 py-1.5 text-sm" : "px-2 py-2 text-sm font-semibold sm:px-4 sm:text-base"}`}
        >
          {live === i && <span aria-hidden="true" className="live-dot" />}
          {labels?.[i] ?? i}
        </button>
      ))}
    </nav>
  );
};
