import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from 'url';
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.join(__dirname, "client", "src"),
      "@shared": path.join(__dirname, "shared"),
      "@assets": path.join(__dirname, "attached_assets"),
    },
  },
  root: path.join(__dirname, "client"),
  build: {
    outDir: path.join(__dirname, "dist/public"),
    emptyOutDir: true,
  },
});
