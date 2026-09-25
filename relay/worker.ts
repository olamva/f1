interface Env {
  RELAY_KEY: string;
}

const ORIGIN = "https://livetiming.formula1.com";
const PASS =
  /^(accept|accept-encoding|authorization|content-type|cookie|upgrade|connection|sec-websocket-.+|user-agent|x-requested-with|x-signalr-user-agent)$/;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const [, key, ...rest] = url.pathname.split("/");
    const path = `/${rest.join("/")}`;
    if (!env.RELAY_KEY || key !== env.RELAY_KEY)
      return new Response("Forbidden\n", { status: 403 });
    if (!/^\/(static|signalrcore)(\/|$)/.test(path))
      return new Response("Not found\n", { status: 404 });
    const headers = new Headers(
      [...request.headers].filter(([k]) => PASS.test(k)),
    );
    return fetch(`${ORIGIN}${path}${url.search}`, {
      method: request.method,
      headers,
      body: request.body,
      redirect: "manual",
    });
  },
};
