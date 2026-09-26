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

self.addEventListener("push", (event) => {
  const { title, ...options } = event.data.json();
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
