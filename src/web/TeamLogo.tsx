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

const WHITE = ["astonmartin", "audi", "cadillac", "mercedes"];

const file = (team: string) =>
  SLUGS[team] ?? team.toLowerCase().replace(/[^a-z0-9]/g, "");

export const logoSrc = (team: string) => IMAGES[`./teams/${file(team)}.webp`];

export const logoTone = (team: string) =>
  WHITE.includes(file(team)) ? "light:invert" : "";

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
      className={`object-contain ${logoTone(team)} ${className}`}
    />
  ) : (
    <span aria-hidden className={className} />
  );
};
