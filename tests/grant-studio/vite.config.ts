import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";
const path = (p: string) => fileURLToPath(new URL(p, import.meta.url));
export default defineConfig({
  root: path("./"),
  publicDir: path("../../public/"),
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: [
      { find: "@/lib/grants/repository", replacement: path("./repository.ts") },
      { find: "@/integrations/supabase/client", replacement: path("./client.ts") },
      { find: "@", replacement: path("../../src/") },
    ],
  },
  build: { outDir: path("../../dist/grant-studio/"), emptyOutDir: true },
});
