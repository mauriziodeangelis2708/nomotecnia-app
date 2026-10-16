import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { setRememberMe } from "@/integrations/supabase/session-storage";
import { useResumeSession } from "@/hooks/use-resume-session";
import { Brand } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): { access?: "client" | "socio" } => ({
    access: search["access"] === "client" ? "client" : "socio",
  }),
  head: () => ({
    meta: [
      { title: "Accesso — NomotecnIA" },
      { name: "description", content: "Accesso clienti e soci NomotecnIA." },
      { property: "og:title", content: "Accesso — NomotecnIA" },
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
  const { access } = Route.useSearch();
  const customer = access === "client";
  const destination = customer ? "/portal" : "/dashboard";
  useResumeSession(destination);
  const nav = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const p = schema.safeParse({ email, password });
    if (!p.success) {
      toast.error(p.error.issues[0]?.message ?? "Dati non validi");
      return;
    }
    setRememberMe(mode === "in" && remember);
    setBusy(true);
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword(p.data);
      setBusy(false);
      if (error) {
        toast.error("Credenziali non valide");
        return;
      }
      nav({ to: destination });
    } else {
      const { error } = await supabase.auth.signUp({
        ...p.data,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: { access_requested: customer ? "client" : "socio" },
        },
      });
      setBusy(false);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success(
        customer
          ? "Registrazione inviata. Conferma la tua email per entrare e compilare il tuo assessment."
          : "Registrazione inviata. Conferma l’email; l’accesso soci richiede l’autorizzazione di un amministratore.",
      );
    }
  }

  async function google() {
    setRememberMe(mode === "in" && remember);
    const r = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/auth?access=" + (customer ? "client" : "socio"),
    });
    if (r.error) {
      toast.error("Accesso Google non riuscito");
      return;
    }
    if (r.redirected) return;
    nav({ to: destination });
  }

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="hidden flex-col justify-between bg-ink p-10 text-ink-foreground md:flex">
        <Brand />
        <p className="max-w-sm font-display text-2xl leading-snug">
          {customer
            ? "Compila e invia i dati della tua azienda."
            : "Area riservata ai soci autorizzati."}
        </p>
        <p className="text-xs opacity-60">
          {customer
            ? "Dopo la conferma email puoi accedere alle tue pratiche. La valutazione è riservata ai soci NomotecnIA."
            : "Accesso soci soggetto ad autorizzazione dell’amministratore."}
        </p>
      </div>
      <div className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm space-y-5">
          <div className="md:hidden">
            <Brand />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild type="button" variant={customer ? "outline" : "default"}>
              <Link to="/auth" search={{ access: "socio" }}>
                Accesso soci
              </Link>
            </Button>
            <Button asChild type="button" variant={customer ? "default" : "outline"}>
              <Link to="/auth" search={{ access: "client" }}>
                Accesso clienti
              </Link>
            </Button>
          </div>
          <h1 className="text-2xl font-semibold">
            {mode === "in"
              ? customer
                ? "Accesso clienti"
                : "Accesso riservato soci"
              : customer
                ? "Registrazione clienti"
                : "Richiedi accesso soci"}
          </h1>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              autoComplete="username"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pw">Password</Label>
            <Input
              id="pw"
              name="password"
              autoComplete={mode === "in" ? "current-password" : "new-password"}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {mode === "in" ? "Accedi" : "Registrati"}
          </Button>
          {mode === "in" && (
            <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
              <input
                type="checkbox"
                name="remember"
                checked={remember}
                disabled={busy}
                onChange={(e) => setRemember(e.target.checked)}
                className="h-5 w-5 accent-primary"
              />
              Resta connesso
            </label>
          )}
          {import.meta.env["VITE_NOMOTECNIA_STAGING"] !== "true" && (
            <Button type="button" variant="outline" className="w-full" onClick={google}>
              Continua con Google
            </Button>
          )}
          <button
            type="button"
            className="text-sm text-primary underline-offset-4 hover:underline"
            onClick={() => setMode(mode === "in" ? "up" : "in")}
          >
            {mode === "in"
              ? customer
                ? "Non hai un account? Registrati"
                : "Non hai un account? Richiedi accesso"
              : "Hai già un account? Accedi"}
          </button>
        </form>
      </div>
    </div>
  );
}
