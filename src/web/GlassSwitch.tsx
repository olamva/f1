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
  const drag = useRef<{
    pointerId: number;
    startX: number;
    start: number;
    moved: boolean;
  } | null>(null);
  const suppressClick = useRef(false);
  const position = (clientX: number) =>
    Math.max(
      0,
      Math.min(1, drag.current!.start + (clientX - drag.current!.startX) / 22),
    );

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
        data-dragging={progress !== null}
        style={{ "--switch-progress": progress ?? 0 } as CSSProperties}
        onPointerDown={(event) => {
          if (disabled) return;
          drag.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            start: Number(checked),
            moved: false,
          };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (drag.current?.pointerId !== event.pointerId) return;
          if (Math.abs(event.clientX - drag.current.startX) > 3)
            drag.current.moved = true;
          if (!drag.current.moved) return;
          setProgress(position(event.clientX));
        }}
        onPointerUp={(event) => {
          if (drag.current?.pointerId !== event.pointerId) return;
          const moved = drag.current.moved;
          const next = position(event.clientX) >= 0.5;
          drag.current = null;
          setProgress(null);
          if (!moved) return;
          suppressClick.current = true;
          if (next !== checked) onChange(next);
        }}
        onPointerCancel={() => {
          drag.current = null;
          setProgress(null);
        }}
      />
      {children}
    </label>
  );
};
