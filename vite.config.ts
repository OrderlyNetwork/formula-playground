import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

import path from "path";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  // Set base path for GitHub Pages deployment
  // Use /formula-playground/ as base path in production environment
  base: process.env.NODE_ENV === "production" ? "/formula-playground/" : "/",
  server: {
    port: 3005,
  },
  plugins: [
    react({
      babel: {
        plugins: [["babel-plugin-react-compiler"]],
      },
    }),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
