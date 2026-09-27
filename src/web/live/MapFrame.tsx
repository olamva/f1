import { useEffect, useRef, useState } from "react";
import { Maximize, Minimize, RotateCw } from "lucide-react";

export const MapFrame = ({
  banner,
  children,
}: {
  banner?: React.ReactNode;
  children: (full: boolean) => React.ReactNode;
}) => {
  const frame = useRef<HTMLDivElement>(null);
  const [full, setFull] = useState(false);
  const [turned, setTurned] = useState(false);
  useEffect(() => {
    const sync = () => {
      setFull(document.fullscreenElement === frame.current);
      setTurned(false);
    };
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);
  return (
    <div
      ref={frame}
      className={`bg-surface ${full ? "fixed inset-0 z-50" : "relative rounded-xl"}`}
    >
      <div
        className={`p-2 ${full ? "flex flex-col gap-2" : ""} ${turned ? "absolute top-0 left-full h-[100dvw] w-[100dvh] origin-top-left rotate-90" : `relative ${full ? "h-full" : ""}`}`}
      >
        {full && banner}
        {full && (
          <button
            type="button"
            aria-label="Rotate the map"
            aria-pressed={turned}
            onClick={() => setTurned((t) => !t)}
            className="glass-gear absolute right-14 bottom-3 z-10 hidden cursor-pointer p-2 pointer-coarse:block"
          >
            <RotateCw size={18} />
          </button>
        )}
        <button
          type="button"
          aria-label={full ? "Exit full screen" : "Show the map in full screen"}
          onClick={() => {
            if (document.fullscreenElement) return document.exitFullscreen();
            if (!full && document.fullscreenEnabled)
              return frame.current!.requestFullscreen();
            setFull(!full);
            setTurned(false);
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
