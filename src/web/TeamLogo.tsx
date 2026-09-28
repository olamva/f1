const IMAGES = import.meta.glob<string>("./teams/*.webp", {
  eager: true,
  query: "?no-inline",
  import: "default",
});

const SLUGS: Record<string, string> = {
  aston_martin: "astonmartin",
  haas: "haasf1team",
  rb: "racingbulls",
  red_bull: "redbullracing",
};

export const logoSrc = (team: string) =>
  IMAGES[
    `./teams/${SLUGS[team] ?? team.toLowerCase().replace(/[^a-z0-9]/g, "")}.webp`
  ];

interface TeamLogoProps {
  team: string;
  className: string;
}

export const TeamLogo = ({ team, className }: TeamLogoProps) => {
  const src = logoSrc(team);
  return src ? (
    <img
      src={src}
      alt=""
      aria-hidden
      className={`object-contain ${className}`}
    />
  ) : (
    <span aria-hidden className={className} />
  );
};
