import { resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  root: "src/web",
  cacheDir: resolve(import.meta.dirname, ".vite"),
  build: { outDir: resolve(import.meta.dirname, "dist"), emptyOutDir: true },
  plugins: [react(), tailwindcss()],
  server: {
    host: "127.0.0.1",
    port: Number(process.env.VITE_PORT ?? 5173),
    strictPort: true,
    proxy: { "^/api/": `http://127.0.0.1:${process.env.PORT ?? 8787}` },
  },
});
