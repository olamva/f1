import type { Context, MiddlewareHandler } from "hono";

type Claim = { typ?: string; val?: string };
type Principal = { auth_typ?: string; claims?: Claim[] };

const EMAIL_CLAIM =
  "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress";

function email(header: string | undefined): string | null {
  if (!header) return null;
  try {
    const p = JSON.parse(
      Buffer.from(header, "base64").toString("utf8"),
    ) as Principal;
    if (p.auth_typ !== "google" || !Array.isArray(p.claims)) return null;
    const values = p.claims
      .filter((c) => c.typ === EMAIL_CLAIM)
      .map((c) => c.val);
    return values.length === 1 && typeof values[0] === "string"
      ? values[0]
      : null;
  } catch {
    return null;
  }
}

const allowed = (address: string): boolean =>
  (process.env.ALLOWED_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .includes(address.toLowerCase());

export const user = (c: Context): string | null => {
  if (process.env.DEV_NO_AUTH === "1") return "dev";
  const address = email(c.req.header("x-ms-client-principal"));
  return address && allowed(address) ? address : null;
};

export const requireGoogle: MiddlewareHandler = async (c, next) => {
  if (user(c)) return next();
  return c.req.header("x-ms-client-principal")
    ? c.json({ error: "This Google account has no access." }, 403)
    : c.json({ error: "Sign in with Google to use this." }, 401);
};
