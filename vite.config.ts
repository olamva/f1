import { resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  root: "src/web",
  cacheDir: resolve(import.meta.dirname, ".vite"),
  build: { outDir: resolve(import.meta.dirname, "dist"), emptyOutDir: true },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      strategies: "injectManifest",
      srcDir: ".",
      filename: "sw.js",
      includeAssets: ["apple-touch-icon.png"],
      manifest: {
        id: "/",
        name: "F1 Timing",
        short_name: "F1",
        description: "Live F1 timing, replays, and season statistics",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#09090b",
        theme_color: "#09090b",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
        ],
      },
    }),
  ],
  server: {
    host: "127.0.0.1",
    port: Number(process.env.VITE_PORT ?? 5173),
    strictPort: true,
    proxy: { "^/api/": `http://127.0.0.1:${process.env.PORT ?? 8787}` },
  },
});
