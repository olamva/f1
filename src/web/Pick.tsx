interface PickProps {
  label: string;
  value: string;
  ids: string[];
  who: Map<string, { name: string }>;
  onChange: (id: string) => void;
}

export const Pick = ({ label, value, ids, who, onChange }: PickProps) => (
  <label className="flex min-w-0 flex-col gap-1 text-xs text-zinc-500">
    {label}
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full cursor-pointer truncate rounded-md bg-zinc-800 px-2 py-1.5 text-sm text-zinc-100 ring-1 ring-zinc-700 focus:ring-zinc-400 focus:outline-none"
    >
      {ids.map((id) => (
        <option key={id} value={id}>
          {who.get(id)?.name ?? id}
        </option>
      ))}
    </select>
  </label>
);
