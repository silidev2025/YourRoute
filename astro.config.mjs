// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import svelte from "@astrojs/svelte";
import AstroPWA from "@vite-pwa/astro";
// https://astro.build/config
export default defineConfig({
  integrations: [
    react(),
    svelte(),
    AstroPWA({
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webmanifest,json,jpg}"],
      },
      includeAssets: ["favicon.ico", "apple-touch-icon.png"],
      manifest: {
        name: "CitMap",
        description:
          "An offline website built to help CITU students find their rooms across the Cebu Institute of Technology - University campus",
        theme_color: "#a30e00",
        icons: [
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
        display_override: ["standalone"],
      },
    }),
  ],
  vite: {
    preview: {
      host: "127.0.0.1",
    },
    server: {
      host: "localhost",
    },
  },
  redirects: {
    "/contribute": "https://forms.gle/nVUMuuZgfW1HgXc98",
    "/messenger": "https://m.me/j/AbbjA1ouHCefGTkU",
  },
});
