import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  // Allow overriding the backend origin without touching the config
  const apiProxyTarget =
    env.VITE_DEV_API_PROXY_TARGET ||
    env.VITE_API_BASE_URL?.replace(/\/api\/?$/, "") ||
    "http://localhost:4000";

  const devServerPort = Number(env.VITE_DEV_SERVER_PORT) || 8080;

  return {
    server: {
      host: "::",
      port: devServerPort,
      proxy: {
        "/api": {
          target: apiProxyTarget,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path, // Keep the path as is
          // Cookies are automatically forwarded by Vite proxy
        },
      },
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
