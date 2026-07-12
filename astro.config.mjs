// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import svelte from "@astrojs/svelte";
import AstroPWA from "@vite-pwa/astro";

const tunnelAllowedHosts = [".trycloudflare.com", ".loca.lt"];

// https://astro.build/config
export default defineConfig({
  integrations: [
    react(),
    svelte(),
    AstroPWA({
      injectRegister: "inline",
      registerType: "autoUpdate",
      workbox: {
        globPatterns: [
          "**/*.{js,css,html,ico,png,svg,webmanifest,json,jpg,ttf,wasm,glb}",
        ],
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
        navigateFallback: "/",
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [
          {
            urlPattern: /\/_astro\/.*\.(?:js|css)$/,
            handler: "CacheFirst",
            options: {
              cacheName: "app-shell-assets",
              expiration: {
                maxEntries: 80,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern:
              /\/(?:manifest\.webmanifest|favicon\.ico|apple-touch-icon\.png|pwa-\d+x\d+\.png|InterVariable(?:-Italic)?\.ttf)$/,
            handler: "CacheFirst",
            options: {
              cacheName: "app-static-assets",
              expiration: {
                maxEntries: 40,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern:
              /^https:\/\/(api\.maptiler\.com|klokantech\.github\.io|maputnik\.github\.io|orangemug\.github\.io)\//,
            handler: "CacheFirst",
            options: {
              cacheName: "map-assets",
              expiration: {
                maxEntries: 500,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
      includeAssets: ["favicon.ico", "apple-touch-icon.png"],
      manifest: {
        name: "YourRoute",
        short_name: "YourRoute",
        description:
          "An offline website built to help CITU students find their rooms across the Cebu Institute of Technology - University campus",
        id: "/",
        start_url: "/",
        scope: "/",
        theme_color: "#872f38",
        background_color: "#872f38",
        icons: [
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "pwa-maskable-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
        display_override: ["standalone"],
      },
    }),
  ],
  vite: {
    preview: {
      host: true,
      allowedHosts: tunnelAllowedHosts,
    },
    server: {
      host: true,
      allowedHosts: tunnelAllowedHosts,
    },
  },
  redirects: {
    "/contribute": "https://forms.gle/nVUMuuZgfW1HgXc98",
    "/messenger": "https://m.me/j/AbbjA1ouHCefGTkU",
  },
});
