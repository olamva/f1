import { useRef } from "react";
import { Menu, Share, Smartphone, SquarePlus, X } from "lucide-react";

const STEPS = [
  [Menu, "In Safari, tap the menu button in the address bar."],
  [Share, "Tap Share."],
  [SquarePlus, "Tap Add to Home Screen. You may need to tap View More."],
  [Smartphone, "Tap Add, then open F1 Pitwall from the Home Screen."],
] as const;

export const InstallSheet = () => {
  const dialog = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        className="text-sm font-semibold text-red-400 underline"
      >
        Show me how
      </button>
      <dialog
        ref={dialog}
        closedby="any"
        className="bg-surface motion-safe:animate-toast-in mx-auto mt-auto mb-0 w-full max-w-lg rounded-t-3xl border-t border-white/10 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-zinc-100 backdrop:bg-black/60"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Add to Home Screen</h2>
          <button
            type="button"
            aria-label="Close"
            onClick={() => dialog.current?.close()}
            className="grid size-9 place-items-center rounded-full bg-zinc-800 hover:bg-zinc-700"
          >
            <X className="size-4" />
          </button>
        </div>
        <ol className="space-y-3 text-sm">
          {STEPS.map(([Icon, text]) => (
            <li key={text} className="flex items-center gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-zinc-800">
                <Icon aria-hidden="true" className="size-4" />
              </span>
              {text}
            </li>
          ))}
        </ol>
        <p className="mt-4 text-sm text-zinc-400">
          Then open Settings in the app and turn on notifications.
        </p>
      </dialog>
    </>
  );
};
