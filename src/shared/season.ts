export type Classified = {
  driver: string;
  team: string;
  grid: number;
  position: number | null;
  order: number;
  points: number;
  status: string;
};

export type QualiResult = {
  driver: string;
  team: string;
  position: number;
  q1: string | null;
  q2: string | null;
  q3: string | null;
};

export type Round = {
  round: number;
  name: string;
  circuit: string;
  country: string;
  sessions: Record<
    | "fp1"
    | "fp2"
    | "fp3"
    | "sprintQualifying"
    | "sprint"
    | "qualifying"
    | "race",
    string | null
  >;
};

export type DriverInfo = {
  id: string;
  code: string;
  name: string;
  number: string;
  team: string;
};

export type Season = {
  year: number;
  rounds: Round[];
  drivers: DriverInfo[];
  teams: { id: string; name: string }[];
  races: { round: number; results: Classified[] }[];
  sprints: { round: number; results: Classified[] }[];
  qualifying: { round: number; results: QualiResult[] }[];
  sprintQualifying: { round: number; results: QualiResult[] }[];
  driverStandings: { id: string; points: number }[];
  constructorStandings: { id: string; points: number }[];
};

export type Pace = Record<string, number[]>;

export type Records = Record<
  string,
  {
    starts: number;
    wins: number;
    podiums: number;
    poles: number;
    titles: number;
  }
>;

export type RaceArchive = {
  year: number;
  races: {
    round: number;
    name: string;
    date: string;
    country: string;
    results: {
      driver: string;
      name: string;
      number: string;
      team: string;
      teamName: string;
      grid: number;
      position: number;
      positionText: string;
      points: number;
      status: string;
    }[];
  }[];
};

export type DriverProfile = {
  id: string;
  name: string;
  nationality: string | null;
  dateOfBirth: string | null;
  number: string | null;
  url: string | null;
  firstSeason: number | null;
  lastSeason: number | null;
  starts: number;
  wins: number;
  podiums: number;
  poles: number | null;
};
