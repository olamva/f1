interface TabsProps<T extends string> {
  items: readonly T[];
  value: T | null;
  onChange: (v: T) => void;
  small?: boolean;
  labels?: Partial<Record<T, string>>;
}

export const Tabs = <T extends string>({
  items,
  value,
  onChange,
  small,
  labels,
}: TabsProps<T>) => (
  <nav
    className={`glass-tabs flex w-fit max-w-full flex-wrap gap-1 sm:gap-1.5 ${small ? "glass-tabs-small p-1" : "p-1 sm:p-1.5"}`}
  >
    {items.map((i) => (
      <button
        key={i}
        onClick={() => onChange(i)}
        type="button"
        aria-pressed={value === i}
        data-active={value === i}
        className={`glass-tab capitalize ${small ? "px-3.5 py-1.5 text-sm" : "px-2 py-2 font-semibold sm:px-4"}`}
      >
        {labels?.[i] ?? i}
      </button>
    ))}
  </nav>
);
