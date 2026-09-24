import { LoaderCircle } from "lucide-react";

interface LoadingProps {
  label: string;
  error?: string | null;
}

export const Loading = ({ label, error }: LoadingProps) => (
  <div
    role="status"
    className="flex min-h-48 flex-col items-center justify-center gap-3 text-sm text-zinc-400"
  >
    {error ? (
      <p className="text-red-400">{error}</p>
    ) : (
      <>
        <LoaderCircle className="size-8 animate-spin text-red-500" />
        <p>{label}</p>
      </>
    )}
  </div>
);
