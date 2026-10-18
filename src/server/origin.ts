import * as token from "./token.ts";

export const F1_ORIGIN =
  process.env.F1_ORIGIN ?? "https://livetiming.formula1.com";

export const archive = (path: string) => {
  const bearer = token.valid();
  return fetch(
    `${F1_ORIGIN}/static/${path}`,
    bearer ? { headers: { authorization: `Bearer ${bearer}` } } : {},
  );
};
