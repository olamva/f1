import { useLayoutEffect, useRef, useState } from "react";

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

  return (
    <nav
      ref={nav}
      className={`glass-tabs relative flex w-fit max-w-full gap-1 p-1 sm:gap-1.5 ${small ? "glass-tabs-small" : "sm:p-1.5"}`}
    >
      {highlight && (
        <span
          className="glass-highlight"
          data-visible={value !== null}
          style={{
            width: highlight.width,
            transform: `translateX(${highlight.left}px)`,
          }}
        />
      )}
      {items.map((i, index) => (
        <button
          key={i}
          ref={(element) => {
            buttons.current[index] = element;
          }}
          onClick={() => onChange(i)}
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
