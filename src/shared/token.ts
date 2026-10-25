export type TokenStatus = {
  configured: boolean;
  expiresAt: number | null;
  sessionExpiresAt: number | null;
};

export type TokenProblem = "missing" | "expired";

export const tokenProblem = (s: TokenStatus): TokenProblem | null =>
  !s.configured
    ? "missing"
    : (s.expiresAt ?? 0) < Date.now()
      ? "expired"
      : null;
