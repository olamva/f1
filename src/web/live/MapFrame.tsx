import { useEffect, useRef, useState } from "react";
import { Maximize, Minimize, RotateCw } from "lucide-react";

export const MapFrame = ({
  banner,
  onRotate,
  children,
}: {
  banner?: React.ReactNode;
  onRotate: () => void;
  children: (full: boolean) => React.ReactNode;
}) => {
  const frame = useRef<HTMLDivElement>(null);
  const [full, setFull] = useState(false);
  useEffect(() => {
    const sync = () => setFull(document.fullscreenElement === frame.current);
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);
  return (
    <div
      ref={frame}
      className={`bg-surface ${full ? "map-fullscreen fixed inset-0 z-50" : "relative rounded-xl"}`}
    >
      <div
        className={`relative p-2 ${full ? "flex h-full flex-col gap-2 pt-[calc(env(safe-area-inset-top)+0.5rem)] pr-[calc(env(safe-area-inset-right)+0.5rem)] pl-[calc(env(safe-area-inset-left)+0.5rem)]" : ""}`}
      >
        {full && banner}
        <button
          type="button"
          aria-label="Rotate the map"
          onClick={onRotate}
          className="glass-gear absolute right-14 bottom-3 z-10 cursor-pointer p-2"
        >
          <RotateCw size={18} />
        </button>
        <button
          type="button"
          aria-label={full ? "Exit full screen" : "Show the map in full screen"}
          onClick={() => {
            if (document.fullscreenElement) return document.exitFullscreen();
            if (!full && document.fullscreenEnabled)
              return frame
                .current!.requestFullscreen()
                .then(() => screen.orientation.lock("landscape"))
                .catch(() => {});
            setFull(!full);
          }}
          className="glass-gear absolute right-3 bottom-3 z-10 cursor-pointer p-2"
        >
          {full ? <Minimize size={18} /> : <Maximize size={18} />}
        </button>
        {children(full)}
      </div>
    </div>
  );
};
