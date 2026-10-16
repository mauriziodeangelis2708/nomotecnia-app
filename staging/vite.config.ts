import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

export default defineConfig({
  root: fileURLToPath(new URL("./pdf-lab/", import.meta.url)),
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("../src/", import.meta.url)),
    },
  },
  define: {
    "import.meta.env.VITE_ENABLE_DOCUMENT_PDF_LAB": JSON.stringify("true"),
  },
  build: {
    outDir: fileURLToPath(new URL("../dist/pdf-staging/", import.meta.url)),
    emptyOutDir: true,
  },
});
