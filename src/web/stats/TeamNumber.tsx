const IMAGES = import.meta.glob<string>("../numbers/*.webp", {
  eager: true,
  query: "?no-inline",
  import: "default",
});

interface TeamNumberProps {
  id: string;
  number: string;
  color: string;
  className: string;
}

export const TeamNumber = ({
  id,
  number,
  color,
  className,
}: TeamNumberProps) => {
  const src = Object.entries(IMAGES).find(([k]) =>
    new RegExp(`[/_]${id}\\.webp$`).test(k),
  )?.[1];
  return src ? (
    <span
      aria-hidden
      className={className}
      style={{
        background: color,
        mask: `url("${src}") center / contain no-repeat`,
      }}
    >
      <img src={src} alt="" className="invisible h-full" />
    </span>
  ) : (
    <span
      aria-hidden
      className={`font-f1 pr-3 leading-none font-black italic ${className}`}
      style={{ color }}
    >
      {number}
    </span>
  );
};
