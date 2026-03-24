import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";

const MANUAL_CHUNK_GROUPS = [
  ["vendor-framework", ["react", "react-dom", "scheduler", "@tanstack/react-router", "zustand"]],
  ["vendor-ui", ["@base-ui/react", "@radix-ui/", "radix-ui", "@floating-ui/", "class-variance-authority", "clsx", "tailwind-merge", "sonner"]],
  ["vendor-motion", ["motion", "driver.js", "lucide-react"]],
  ["vendor-calendar", ["react-day-picker", "date-fns", "@date-fns/"]],
  ["vendor-tauri", ["@tauri-apps/api", "@tauri-apps/plugin-opener"]],
] as const;

function normalizeModuleId(id: string) {
  return id.replace(/\\/g, "/");
}

function matchesPackage(id: string, pkg: string) {
  return pkg.endsWith("/")
    ? id.includes(`/node_modules/${pkg}`)
    : id.includes(`/node_modules/${pkg}/`) || id.endsWith(`/node_modules/${pkg}`);
}

function manualChunks(id: string) {
  const normalizedId = normalizeModuleId(id);

  if (!normalizedId.includes("/node_modules/")) {
    if (normalizedId.includes("/src/features/worklog/")) return "feature-worklog";
    if (normalizedId.includes("/src/features/settings/")) return "feature-settings";
    if (normalizedId.includes("/src/features/play/")) return "feature-play";
    if (normalizedId.includes("/src/features/setup/")) return "feature-setup";
    if (normalizedId.includes("/src/features/onboarding/")) return "feature-onboarding";
    if (normalizedId.includes("/src/features/home/")) return "feature-home";
    if (normalizedId.includes("/src/features/tray/")) return "feature-tray";
    return undefined;
  }

  const match = MANUAL_CHUNK_GROUPS.find(([, packages]) =>
    packages.some((pkg) => matchesPackage(normalizedId, pkg)),
  );

  return match?.[0];
}

const reactCompilerBabelOptions = {
  presets: [reactCompilerPreset()],
} as Parameters<typeof babel>[0];

export default defineConfig(async () => ({
  plugins: [tailwindcss(), ...react(), await babel(reactCompilerBabelOptions)],
  clearScreen: false,
  build: {
    rollupOptions: {
      input: {
        app: fileURLToPath(new URL("./app.html", import.meta.url)),
        tray: fileURLToPath(new URL("./tray.html", import.meta.url)),
        index: fileURLToPath(new URL("./index.html", import.meta.url)),
      },
      output: {
        manualChunks,
      },
    },
  },
  server: {
    port: 1420,
    strictPort: true,
  },
  envPrefix: ["VITE_", "TAURI_"],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
  },
}));
