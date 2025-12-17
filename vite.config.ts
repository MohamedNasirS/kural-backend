import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { visualizer } from "rollup-plugin-visualizer";

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
    plugins: [
      react(),
      mode === "development" && componentTagger(),
      // Bundle analyzer - generates stats.html after build
      mode === "production" && process.env.ANALYZE === "true" && visualizer({
        filename: "dist/stats.html",
        open: true,
        gzipSize: true,
        brotliSize: true,
      }),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      // Target modern browsers for smaller bundle
      target: 'es2020',
      // Minification settings
      minify: 'esbuild',
      // Source maps for production debugging (optional)
      sourcemap: false,
      // Chunk size warning limit (500KB)
      chunkSizeWarningLimit: 500,
      rollupOptions: {
        output: {
          manualChunks: {
            // Vendor chunks - split large dependencies
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            'vendor-radix-core': [
              '@radix-ui/react-dialog',
              '@radix-ui/react-select',
              '@radix-ui/react-tabs',
              '@radix-ui/react-tooltip',
            ],
            'vendor-radix-menu': [
              '@radix-ui/react-popover',
              '@radix-ui/react-dropdown-menu',
              '@radix-ui/react-menubar',
              '@radix-ui/react-context-menu',
            ],
            'vendor-radix-form': [
              '@radix-ui/react-checkbox',
              '@radix-ui/react-radio-group',
              '@radix-ui/react-switch',
              '@radix-ui/react-slider',
              '@radix-ui/react-label',
            ],
            'vendor-charts': ['recharts'],
            'vendor-forms': ['react-hook-form', 'zod', '@hookform/resolvers'],
            'vendor-utils': ['date-fns', 'clsx', 'tailwind-merge', 'class-variance-authority'],
            'vendor-tanstack': ['@tanstack/react-query'],
          },
        },
      },
    },
  };
});
