import { useRef, useState, type CSSProperties, type ReactNode } from "react";

interface GlassSwitchProps {
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
}

export const GlassSwitch = ({
  checked,
  disabled = false,
  onChange,
  children,
}: GlassSwitchProps) => {
  const [progress, setProgress] = useState<number | null>(null);
  const [held, setHeld] = useState(false);
  const drag = useRef<{
    pointerId: number;
    startX: number;
    start: number;
    moved: boolean;
    value: boolean;
  } | null>(null);
  const suppressClick = useRef(false);
  const release = useRef(0);
  const position = (clientX: number) =>
    Math.max(
      0,
      Math.min(1, drag.current!.start + (clientX - drag.current!.startX) / 22),
    );
  const commit = (value: boolean) => {
    if (disabled || value === drag.current!.value) return;
    drag.current!.value = value;
    onChange(value);
  };
  const end = (delay: number) => {
    drag.current = null;
    setProgress(null);
    release.current = window.setTimeout(() => setHeld(false), delay);
  };

  return (
    <label
      className="flex cursor-pointer items-center gap-3 text-sm"
      onClickCapture={(event) => {
        if (!suppressClick.current) return;
        event.preventDefault();
        suppressClick.current = false;
      }}
    >
      <input
        type="checkbox"
        className="peer sr-only"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span
        className="glass-switch"
        data-held={held}
        data-dragging={progress !== null}
        style={{ "--switch-progress": progress ?? 0 } as CSSProperties}
        onPointerDown={(event) => {
          if (disabled || !event.isPrimary || event.button !== 0) return;
          clearTimeout(release.current);
          suppressClick.current = false;
          drag.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            start: Number(checked),
            moved: false,
            value: checked,
          };
          setHeld(true);
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (drag.current?.pointerId !== event.pointerId) return;
          if (Math.abs(event.clientX - drag.current.startX) > 3)
            drag.current.moved = true;
          if (!drag.current.moved) return;
          const next = position(event.clientX);
          setProgress(next);
          if (next === 0 || next === 1) commit(next === 1);
        }}
        onPointerUp={(event) => {
          if (drag.current?.pointerId !== event.pointerId) return;
          const moved = drag.current.moved;
          if (moved) {
            suppressClick.current = true;
            commit(position(event.clientX) >= 0.5);
          }
          end(moved ? 0 : 300);
        }}
        onPointerCancel={() => {
          if (drag.current) end(0);
        }}
      />
      {children}
    </label>
  );
};
