import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { copyFileSync, existsSync } from "fs";

export default defineConfig({
  base: "/Stacks/",
  plugins: [react()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  server: {
    proxy: {
      "/api": "https://stacks-admin.onrender.com",
    },
  },
  build: {
    outDir: "dist",
    // <-- keep rollupOptions only for specific customizations
    // Do NOT include:
    // rollupOptions: { external: ... } for app deploys!
  },
  closeBundle() {
    const redirectsPath = resolve(__dirname, "_redirects");
    const distRedirectsPath = resolve(__dirname, "dist/_redirects");

    if (existsSync(redirectsPath)) {
      try {
        copyFileSync(redirectsPath, distRedirectsPath);
        console.log("✅ _redirects file copied to dist/");
      } catch (err) {
        console.error("❌ Failed to copy _redirects file:", err);
      }
    } else {
      console.warn("⚠️  No _redirects file found at project root.");
    }

    // Ensure SPA fallback on GitHub Pages: copy index.html -> dist/404.html
    const indexPath = resolve(__dirname, "index.html");
    const dist404Path = resolve(__dirname, "dist/404.html");

    if (existsSync(indexPath)) {
      try {
        copyFileSync(indexPath, dist404Path);
        console.log("✅ 404.html (SPA fallback) created in dist/");
      } catch (err) {
        console.error("❌ Failed to copy index.html to dist/404.html:", err);
      }
    } else {
      console.warn("⚠️  No index.html found at project root to create dist/404.html.");
    }
  },
});
