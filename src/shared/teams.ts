export const TEAM_COLORS: Record<string, string> = {
  alpine: "#00A1E8",
  aston_martin: "#229971",
  audi: "#FF2D00",
  cadillac: "#AAAAAD",
  ferrari: "#E8002D",
  haas: "#DEE1E2",
  mclaren: "#FF8000",
  mercedes: "#27F4D2",
  rb: "#6692FF",
  red_bull: "#3671C6",
  williams: "#1868DB",
};

export const teamColor = (id: string): string => TEAM_COLORS[id] ?? "#888888";
