import type { MiddlewareHandler } from "hono";

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

export const requireGoogle: MiddlewareHandler = async (c, next) => {
  if (process.env.DEV_NO_AUTH === "1") return next();
  const principal = c.req.header("x-ms-client-principal");
  if (!principal) {
    const back = encodeURIComponent(c.req.path);
    return c.redirect(`/.auth/login/google?post_login_redirect_uri=${back}`);
  }
  const address = email(principal);
  if (!address || !allowed(address)) return c.text("Not your paddock.\n", 403);
  return next();
};
