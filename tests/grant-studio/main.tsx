import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GrantStudio } from "../../src/components/grants/GrantStudio";
import "../../src/styles.css";
createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <main className="mx-auto max-w-5xl p-4">
      <p>COLLAUDO SINTETICO · modello simulato · nessun account reale</p>
      <GrantStudio />
    </main>
  </QueryClientProvider>,
);
