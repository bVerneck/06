import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: "./",
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: null,
      filename: "sw.js",
      devOptions: { enabled: false },
      includeAssets: ["favicon.png", "icons/icon-192.png", "icons/icon-512.png"],
      manifest: false,
      workbox: {
        clientsClaim: true,
        skipWaiting: true,
        cleanupOutdatedCaches: true,
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/~oauth/],
        importScripts: ["/alarm-sw.js"],
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webmanifest,woff,woff2,ttf}"],
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === "navigate",
            handler: "NetworkFirst",
            options: { cacheName: "html-navigations", networkTimeoutSeconds: 3 },
          },
          {
            urlPattern: ({ url }: { url: URL }) =>
              url.origin === "https://fonts.googleapis.com" || url.origin === "https://fonts.gstatic.com",
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts",
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: ({ sameOrigin, request }: { sameOrigin: boolean; request: Request }) =>
              sameOrigin && ["style", "script", "image", "font"].includes(request.destination),
            handler: "CacheFirst",
            options: { cacheName: "static-assets", expiration: { maxEntries: 200 } },
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
}));
