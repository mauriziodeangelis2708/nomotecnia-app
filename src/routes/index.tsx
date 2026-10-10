import { createFileRoute, Link } from "@tanstack/react-router";
import { Brand } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NomotecnIA Assessment Bandi — Area riservata" },
      {
        name: "description",
        content: "Assessment di bandi e agevolazioni: area soci e area clienti.",
      },
      { property: "og:title", content: "NomotecnIA Assessment Bandi" },
      { property: "og:description", content: "Area soci e area clienti." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="flex min-h-screen flex-col bg-ink text-ink-foreground">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6">
        <Brand />
        <Button asChild variant="secondary" size="sm">
          <Link to="/auth" search={{ access: "socio" }}>
            Accesso soci
          </Link>
        </Button>
      </header>
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-6 pb-24">
        <p className="text-sm uppercase tracking-[0.2em] text-sidebar-primary">
          Bandi e agevolazioni
        </p>
        <h1 className="mt-4 max-w-3xl font-display text-4xl font-medium leading-tight md:text-6xl">
          Pre-istruttoria strutturata, prudente, tracciabile.
        </h1>
        <p className="mt-6 max-w-2xl text-base opacity-80">
          Sei un cliente? Compila i dati della tua azienda e inviali a NomotecnIA. I soci accedono
          all’area riservata per svolgere la valutazione.
        </p>
        <div className="mt-10 flex flex-wrap items-center gap-4">
          <Button asChild size="lg">
            <Link to="/auth" search={{ access: "socio" }}>
              Accesso riservato soci
            </Link>
          </Button>
          <Button asChild size="lg" variant="secondary">
            <Link to="/auth" search={{ access: "client" }}>
              Accesso clienti
            </Link>
          </Button>
          <span className="flex items-center gap-2 text-sm opacity-70">
            <ShieldCheck className="h-4 w-4" /> Area soci su autorizzazione
          </span>
        </div>
        <p className="mt-16 max-w-2xl text-xs opacity-60">
          Strumento preliminare: non costituisce certificazione di ammissibilità né garanzia di
          concessione del contributo.
        </p>
      </main>
    </div>
  );
}
