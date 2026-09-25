import { matchPrecache, precacheAndRoute } from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";

registerRoute(
  new NavigationRoute(
    async ({ event }) => {
      try {
        return await fetch(event.request);
      } catch {
        return (await matchPrecache("/index.html")) ?? Response.error();
      }
    },
    { denylist: [/^\/api\//, /^\/\.auth\//] },
  ),
);

precacheAndRoute(self.__WB_MANIFEST);
