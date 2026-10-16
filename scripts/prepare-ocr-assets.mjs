import { copyFileSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";

// First-party assets only: OCR never downloads a worker/model from a third-party CDN.
const root = "public/ocr/v7";
mkdirSync(join(root, "core"), { recursive: true });
mkdirSync(join(root, "lang"), { recursive: true });
copyFileSync("node_modules/tesseract.js/dist/worker.min.js", join(root, "worker.min.js"));
for (const file of readdirSync("node_modules/tesseract.js-core")) {
  if (/\.wasm(?:\.js)?$/.test(file) || file === "LICENSE") {
    copyFileSync(join("node_modules/tesseract.js-core", file), join(root, "core", file));
  }
}
copyFileSync(
  "node_modules/@tesseract.js-data/ita/4.0.0_best_int/ita.traineddata.gz",
  join(root, "lang/ita.traineddata.gz"),
);
console.log("Prepared first-party Italian OCR worker, WASM and language model");
