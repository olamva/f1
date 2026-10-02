import { useState, type HTMLAttributes } from "react";

interface StealthInputProps {
  value: string;
  label: string;
  inputMode?: HTMLAttributes<HTMLInputElement>["inputMode"];
  onCommit: (n: number) => void;
}

export const StealthInput = ({
  value,
  label,
  inputMode,
  onCommit,
}: StealthInputProps) => {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <input
      aria-label={label}
      inputMode={inputMode}
      enterKeyHint="go"
      placeholder={value}
      value={draft ?? value}
      onFocus={() => setDraft("")}
      onChange={(e) => setDraft(e.target.value.replace(/[^\d:]/g, ""))}
      onKeyDown={(e) => {
        if (e.key === "Escape") e.currentTarget.value = "";
        if (e.key === "Enter" || e.key === "Escape") e.currentTarget.blur();
      }}
      onBlur={(e) => {
        const text = e.currentTarget.value;
        if (/\d/.test(text))
          onCommit(text.split(":").reduce((n, p) => n * 60 + Number(p), 0));
        setDraft(null);
      }}
      style={{ width: `${(draft || value).length}ch` }}
      className="-mx-1 box-content cursor-text rounded-sm px-1 text-right outline-none placeholder:text-zinc-500 hover:bg-white/10 focus:bg-white/10"
    />
  );
};
