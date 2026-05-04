import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "");
  const apiTarget =
    env.VITE_API_TARGET?.trim() ||
    `http://127.0.0.1:${env.VITE_API_PORT?.trim() || "3000"}`;

  /** VPN / корпоративная сеть: если страница не грузится или HMR «отвалился», задайте VITE_HMR_HOST=127.0.0.1 в apps/client/.env.development */
  const hmrHost = env.VITE_HMR_HOST?.trim();
  const hmrPort = Number(env.VITE_HMR_CLIENT_PORT) || 5173;
  const hmrProtocol = env.VITE_HMR_PROTOCOL === "wss" ? "wss" : "ws";

  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: ["icons.svg"],
        manifest: {
          name: "Aegis",
          short_name: "Aegis",
          description: "Кроссплатформенный веб-мессенджер",
          theme_color: "#121212",
          background_color: "#121212",
          display: "standalone",
          start_url: "/",
          icons: [
            {
              src: "icons.svg",
              sizes: "512x512",
              type: "image/svg+xml",
              purpose: "any",
            },
          ],
        },
      }),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "@aegis/shared": path.resolve(
          __dirname,
          "../../packages/shared/src/index.ts",
        ),
      },
    },
    server: {
      host: true,
      port: 5173,
      strictPort: false,
      ...(hmrHost
        ? {
            hmr: {
              host: hmrHost,
              port: hmrPort,
              clientPort: hmrPort,
              protocol: hmrProtocol,
            },
          }
        : {}),
      proxy: {
        "/api": { target: apiTarget, changeOrigin: true },
        "/socket.io": {
          target: apiTarget,
          changeOrigin: true,
          ws: true,
        },
      },
    },
  };
});
