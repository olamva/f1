import { setDelay, useDelay } from "./delay.ts";

export const DelayInput = () => {
  const delay = useDelay();
  return (
    <label className="flex items-center gap-2 text-sm text-zinc-300">
      <input
        inputMode="numeric"
        maxLength={2}
        placeholder="0"
        value={delay || ""}
        onChange={(e) => setDelay(Number(e.target.value.replace(/\D/g, "")))}
        className="glass-control tabular w-14 px-2 py-1 text-right placeholder:text-zinc-600"
      />
      seconds behind live
    </label>
  );
};
