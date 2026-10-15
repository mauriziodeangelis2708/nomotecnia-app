import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { PdfLabApp } from "./PdfLabApp";
import "../../src/styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("Contenitore del laboratorio non trovato");
createRoot(root).render(
  <StrictMode>
    <PdfLabApp />
  </StrictMode>,
);
