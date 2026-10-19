import {
  getAuth,
  initOidcAuthMiddleware,
  oidcAuthMiddleware,
  processOAuthCallback,
} from "@hono/oidc-auth";
import { Hono, type Context, type MiddlewareHandler } from "hono";
import { getCookie, setCookie } from "hono/cookie";

const COOKIE = "oidc-auth";
const CALLBACK = "/.auth/login/google/callback";
const EXPIRES = 30 * 24 * 3600;

const allowed = (address: string): boolean =>
  (process.env.ALLOWED_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .includes(address.toLowerCase());

const oidc: MiddlewareHandler = (c, next) => {
  const site = `https://${c.req.header("host")}`;
  return process.env.OIDC_AUTH_SECRET
    ? initOidcAuthMiddleware({
        OIDC_ISSUER: "https://accounts.google.com",
        OIDC_SCOPES: "openid email",
        OIDC_REDIRECT_URI: site + CALLBACK,
        OIDC_AUTH_EXTERNAL_URL: site,
        OIDC_AUTH_EXPIRES: String(EXPIRES),
      })(c, next)
    : next();
};

const session: MiddlewareHandler = async (c, next) => {
  const auth = c.get("oidcAuthEnv") && (await getAuth(c).catch(() => null));
  if (auth)
    setCookie(c, COOKIE, c.get("oidcAuthJwt") ?? getCookie(c, COOKIE)!, {
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
      maxAge: auth.ssnexp - Math.floor(Date.now() / 1000),
    });
  return next();
};

export const sessions = new Hono()
  .use("/api/*", oidc, session)
  .use("/.auth/*", oidc)
  .get("/.auth/login/google", oidcAuthMiddleware(), (c) => {
    const to = c.req.query("post_login_redirect_uri") ?? "/";
    return c.redirect(/^\/(?![/\\])/.test(to) ? to : "/");
  })
  .get(CALLBACK, (c) => {
    c.set("oidcClaimsHook", async (orig, claims) => ({
      sub: claims?.sub ?? orig?.sub ?? "",
      email: claims?.email_verified === true ? String(claims.email) : "",
    }));
    return processOAuthCallback(c);
  });

export const user = (c: Context): string | null => {
  if (process.env.DEV_NO_AUTH === "1") return "dev";
  const address = c.get("oidcAuth")?.email;
  return address && allowed(address) ? address : null;
};

export const requireGoogle: MiddlewareHandler = async (c, next) => {
  if (user(c)) return next();
  return c.get("oidcAuth")
    ? c.json({ error: "This Google account has no access." }, 403)
    : c.json({ error: "Sign in with Google to use this." }, 401);
};
