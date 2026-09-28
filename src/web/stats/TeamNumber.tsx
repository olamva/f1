import { useState } from "react";

const TEAM_SLUGS: Record<string, string> = {
  aston_martin: "astonmartin",
  haas: "haasf1team",
  rb: "racingbulls",
  red_bull: "redbullracing",
};

const letters = (word = "") =>
  word
    .normalize("NFD")
    .toLowerCase()
    .replace(/[^a-z]/g, "")
    .slice(0, 3);

const numberImage = (year: number, team: string, name: string) => {
  const words = name.split(" ");
  const driver = `${letters(words[0])}${letters(words.at(-1))}01`;
  const slug = TEAM_SLUGS[team] ?? team;
  return `https://media.formula1.com/image/upload/c_fit,h_200/q_auto/v1740000001/common/f1/${year}/${slug}/${driver}/${year}${slug}${driver}numberwhitefrless.webp`;
};

interface TeamNumberProps {
  year: number;
  team: string;
  name: string;
  number: string;
  color: string;
  className: string;
}

export const TeamNumber = ({
  year,
  team,
  name,
  number,
  color,
  className,
}: TeamNumberProps) => {
  const [failed, setFailed] = useState(false);
  const src = numberImage(year, team, name);
  return failed ? (
    <span
      aria-hidden
      className={`font-f1 pr-3 leading-none font-black italic ${className}`}
      style={{ color }}
    >
      {number}
    </span>
  ) : (
    <span
      aria-hidden
      className={className}
      style={{
        background: color,
        mask: `url("${src}") center / contain no-repeat`,
      }}
    >
      <img
        src={src}
        alt=""
        onError={() => setFailed(true)}
        className="invisible h-full"
      />
    </span>
  );
};
