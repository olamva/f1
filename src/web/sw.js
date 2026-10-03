import { matchPrecache, precacheAndRoute } from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";
import { StaleWhileRevalidate } from "workbox-strategies";

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

registerRoute(
  ({ url }) =>
    /^\/api\/(season|results\/|standings\/|drivers\/|pace\/)/.test(
      url.pathname,
    ),
  new StaleWhileRevalidate({ cacheName: "api" }),
);

precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener("push", (event) => {
  const { title, start, ...options } = event.data.json();
  if (start)
    options.body = `Start delayed to ${new Date(start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.`;
  event.waitUntil(
    self.registration.showNotification(title, {
      icon: "/icon-192.png",
      ...options,
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow("/"));
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});
