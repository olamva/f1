import { setDelay, useDelay } from "./delay.ts";

const step =
  "glass-control tabular size-8 cursor-pointer text-sm font-semibold";

export const DelayInput = () => {
  const delay = useDelay();
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-300">
      <button
        type="button"
        aria-label="1 second less"
        onClick={() => setDelay(Math.max(0, delay - 1))}
        className={step}
      >
        −1
      </button>
      <input
        aria-label="Seconds behind live"
        inputMode="numeric"
        maxLength={3}
        placeholder="0"
        value={delay || ""}
        onChange={(e) => setDelay(Number(e.target.value.replace(/\D/g, "")))}
        className="glass-control tabular w-14 px-2 py-1 text-right placeholder:text-zinc-600"
      />
      <button
        type="button"
        aria-label="1 second more"
        onClick={() => setDelay(delay + 1)}
        className={step}
      >
        +1
      </button>
      seconds behind live
    </div>
  );
};
