import react from "@vitejs/plugin-react";
import { execSync } from "node:child_process";
import { defineConfig } from "vite";

/** Versione mostrata in fondo al sito: ultimi caratteri del commit e ora di compilazione. */
const sha = (() => {
  try { return process.env.GITHUB_SHA?.slice(0, 7) ?? execSync("git rev-parse --short HEAD").toString().trim(); } catch { return "locale"; }
})();

export default defineConfig({
  plugins: [react()],
  define: { __BUILD__: JSON.stringify({ sha, at: new Date().toISOString() }) },
});
