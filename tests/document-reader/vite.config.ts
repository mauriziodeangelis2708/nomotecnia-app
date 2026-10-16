import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

export default defineConfig({
  root: fileURLToPath(new URL("./", import.meta.url)),
  publicDir: fileURLToPath(new URL("../../public/", import.meta.url)),
  plugins: [
    {
      name: "synthetic-reader-diagnostics",
      enforce: "pre",
      transform(code, id) {
        if (id.endsWith("/src/lib/local-pdf-reader.ts"))
          return code.replace(
            "} catch (err) {",
            '} catch (err) { console.info("SYNTHETIC_READER_DIAGNOSTIC", err instanceof Error ? err.stack || err.name + ": " + err.message : String(err));',
          );
      },
    },
    react(),
    tailwindcss(),
  ],
  resolve: { alias: { "@": fileURLToPath(new URL("../../src/", import.meta.url)) } },
  build: {
    outDir: fileURLToPath(new URL("../../dist/document-reader/", import.meta.url)),
    emptyOutDir: true,
  },
});
