import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Brand } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Accesso soci — NomotecnIA" },
      { name: "description", content: "Accesso riservato ai soci autorizzati NomotecnIA." },
      { property: "og:title", content: "Accesso soci — NomotecnIA" },
      { property: "og:description", content: "Accesso riservato ai soci autorizzati." },
    ],
  }),
  component: AuthPage,
});

const schema = z.object({
  email: z.string().trim().email("Email non valida").max(255),
  password: z.string().min(8, "Minimo 8 caratteri").max(128),
});

function AuthPage() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const p = schema.safeParse({ email, password });
    if (!p.success) {
      toast.error(p.error.issues[0]?.message ?? "Dati non validi");
      return;
    }
    setBusy(true);
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword(p.data);
      setBusy(false);
      if (error) {
        toast.error("Credenziali non valide");
        return;
      }
      nav({ to: "/dashboard" });
    } else {
      const { error } = await supabase.auth.signUp({
        ...p.data,
        options: { emailRedirectTo: `${window.location.origin}/dashboard` },
      });
      setBusy(false);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success(
        "Registrazione inviata. Conferma l'email; l'accesso ai dati richiede l'autorizzazione di un amministratore.",
      );
    }
  }

  async function google() {
    const r = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/auth",
    });
    if (r.error) {
      toast.error("Accesso Google non riuscito");
      return;
    }
    if (r.redirected) return;
    nav({ to: "/dashboard" });
  }

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="hidden flex-col justify-between bg-ink p-10 text-ink-foreground md:flex">
        <Brand />
        <p className="max-w-sm font-display text-2xl leading-snug">
          Area riservata ai soci autorizzati.
        </p>
        <p className="text-xs opacity-60">
          Nessun dato è esposto pubblicamente. Ogni accesso è soggetto ad autorizzazione.
        </p>
      </div>
      <div className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm space-y-5">
          <div className="md:hidden">
            <Brand />
          </div>
          <h1 className="text-2xl font-semibold">
            {mode === "in" ? "Accedi" : "Richiedi accesso"}
          </h1>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pw">Password</Label>
            <Input
              id="pw"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {mode === "in" ? "Accedi" : "Registrati"}
          </Button>
          <Button type="button" variant="outline" className="w-full" onClick={google}>
            Continua con Google
          </Button>
          <button
            type="button"
            className="text-sm text-primary underline-offset-4 hover:underline"
            onClick={() => setMode(mode === "in" ? "up" : "in")}
          >
            {mode === "in" ? "Non hai un account? Richiedi accesso" : "Hai già un account? Accedi"}
          </button>
        </form>
      </div>
    </div>
  );
}
