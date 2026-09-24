interface TabsProps<T extends string> {
  items: readonly T[];
  value: T;
  onChange: (v: T) => void;
  small?: boolean;
}

export const Tabs = <T extends string>({ items, value, onChange, small }: TabsProps<T>) => (
  <nav className="flex flex-wrap gap-1">
    {items.map((i) => (
      <button
        key={i}
        onClick={() => onChange(i)}
        className={`rounded-lg capitalize ${small ? "px-3 py-1 text-sm" : "px-4 py-2 font-semibold"} ${
          value === i ? "bg-red-600 text-white" : "text-zinc-400 hover:bg-zinc-800"
        }`}
      >
        {i}
      </button>
    ))}
  </nav>
);
