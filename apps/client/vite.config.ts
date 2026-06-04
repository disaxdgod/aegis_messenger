import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import basicSsl from "@vitejs/plugin-basic-ssl";
import { defineConfig, loadEnv } from "vite";
import vitePluginBundleObfuscator from "vite-plugin-bundle-obfuscator";
import { VitePWA } from "vite-plugin-pwa";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "");
  const apiTarget =
    env.VITE_API_TARGET?.trim() ||
    `http://127.0.0.1:${env.VITE_API_PORT?.trim() || "3000"}`;

  const customKey = env.VITE_DEV_HTTPS_KEY?.trim();
  const customCert = env.VITE_DEV_HTTPS_CERT?.trim();
  const customHttpsOpts =
    mode === "development" &&
    customKey &&
    customCert &&
    fs.existsSync(customKey) &&
    fs.existsSync(customCert) ?
      {
        key: fs.readFileSync(customKey),
        cert: fs.readFileSync(customCert),
      }
    : undefined;

  /**
   * Встроенный basic-ssl только при `VITE_USE_HTTPS=1` — сертификат не доверенный, Chromium
   * покажет красное предупреждение.
   * Надёжный локальный HTTPS: [mkcert](https://github.com/FiloSottile/mkcert) + VITE_DEV_HTTPS_KEY / VITE_DEV_HTTPS_CERT.
   * Для `http://localhost` Web Crypto в Chromium всё равно в secure context — отдельный HTTPS не обязателен.
   */
  const useBasicSsl =
    mode === "development" &&
    customHttpsOpts == null &&
    (env.VITE_USE_HTTPS === "1" ||
      env.VITE_USE_HTTPS?.toLowerCase() === "true");

  const devHttps = Boolean(customHttpsOpts || useBasicSsl);

  /** VPN / корпоративная сеть: если страница не грузится или HMR «отвалился», задайте VITE_HMR_HOST=127.0.0.1 в apps/client/.env.development */
  const hmrHost = env.VITE_HMR_HOST?.trim();
  const hmrPort = Number(env.VITE_HMR_CLIENT_PORT) || 5173;
  const defaultHmrProtocol =
    devHttps ? "wss" : env.VITE_HMR_PROTOCOL === "wss" ? "wss" : "ws";
  const hmrProtocol =
    env.VITE_HMR_PROTOCOL?.trim() === "ws" ?
      "ws"
    : env.VITE_HMR_PROTOCOL?.trim() === "wss" ?
      "wss"
    : defaultHmrProtocol;

  const hmrConfig =
    hmrHost ?
      {
        host: hmrHost,
        port: hmrPort,
        clientPort: hmrPort,
        protocol: hmrProtocol as "ws" | "wss",
      }
    : devHttps ?
      { protocol: hmrProtocol as "ws" | "wss" }
    : undefined;

  const isProduction = mode === "production";

  return {
    plugins: [
      react(),
      tailwindcss(),
      ...(useBasicSsl ? [basicSsl()] : []),
      ...(isProduction ?
        [
          vitePluginBundleObfuscator({
            apply: "build",
            enable: true,
            threadPool: true,
            autoExcludeNodeModules: true,
            excludes: [/^workbox/, /service-worker/],
            options: {
              compact: true,
              identifierNamesGenerator: "hexadecimal",
              renameGlobals: false,
              selfDefending: false,
              stringArray: true,
              stringArrayEncoding: ["base64"],
              stringArrayThreshold: 0.5,
              transformObjectKeys: false,
            },
          }),
        ]
      : []),
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
    build: {
      sourcemap: false,
      minify: "esbuild",
      rollupOptions: {
        output: {
          entryFileNames: "assets/[hash].js",
          chunkFileNames: "assets/[hash].js",
          assetFileNames: "assets/[hash][extname]",
        },
      },
    },
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
      ...(customHttpsOpts ? { https: customHttpsOpts } : {}),
      ...(hmrConfig ? { hmr: hmrConfig } : {}),
      proxy: {
        "/uploads": { target: apiTarget, changeOrigin: true },
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
