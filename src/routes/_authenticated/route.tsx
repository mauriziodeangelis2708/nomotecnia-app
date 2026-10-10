import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Brand } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { useMe } from "@/hooks/use-rules";
import { LayoutDashboard, Settings2, LogOut, Lock } from "lucide-react";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    const { data: roles, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id);
    if (roleError) throw roleError;
    // Metadata controls only the waiting screen, never permissions.
    if (!roles?.length && data.user.user_metadata["access_requested"] !== "socio")
      throw redirect({ to: "/portal" });
    return { user: data.user };
  },
  component: Layout,
});

function Layout() {
  const me = useMe();
  const qc = useQueryClient();
  const nav = useNavigate();
  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    nav({ to: "/auth", replace: true });
  }
  return (
    <div className="flex min-h-screen">
      <aside className="no-print hidden w-60 shrink-0 flex-col bg-sidebar p-5 text-sidebar-foreground md:flex">
        <Brand />
        <nav className="mt-10 space-y-1 text-sm">
          <Link
            to="/dashboard"
            className="flex items-center gap-2 rounded-md px-3 py-2 hover:bg-sidebar-accent"
            activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground" }}
          >
            <LayoutDashboard className="h-4 w-4" /> Clienti e assessment
          </Link>
          {me.data?.isAdmin && (
            <Link
              to="/admin"
              className="flex items-center gap-2 rounded-md px-3 py-2 hover:bg-sidebar-accent"
              activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground" }}
            >
              <Settings2 className="h-4 w-4" /> Admin · Regole
            </Link>
          )}
        </nav>
        <div className="mt-auto space-y-2 text-xs">
          <div className="truncate opacity-70">{me.data?.email}</div>
          <div className="opacity-50">
            {me.data?.isAdmin ? "Amministratore" : me.data?.isMember ? "Socio" : "In attesa"}
          </div>
          <button
            onClick={signOut}
            className="flex items-center gap-2 opacity-80 hover:opacity-100"
          >
            <LogOut className="h-3.5 w-3.5" /> Esci
          </button>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print flex flex-wrap items-center justify-between gap-2 border-b bg-card px-4 py-3 md:hidden">
          <Brand sub={false} />
          <div className="flex gap-2">
            <Button asChild size="sm" variant="ghost">
              <Link to="/dashboard">Clienti</Link>
            </Button>
            {me.data?.isAdmin && (
              <Button asChild size="sm" variant="ghost">
                <Link to="/admin">Admin</Link>
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={signOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-8">
          {me.isLoading ? (
            <p>Verifica accesso…</p>
          ) : me.error || !me.data ? (
            <p role="alert" className="text-destructive">
              Impossibile verificare le autorizzazioni. Riprova o accedi nuovamente.
            </p>
          ) : !me.data.isMember ? (
            <div className="mx-auto mt-20 max-w-md rounded-lg border bg-card p-8 text-center">
              <Lock className="mx-auto h-8 w-8 text-primary" />
              <h1 className="mt-4 text-lg font-semibold">Accesso in attesa di autorizzazione</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Il tuo account ({me.data.email}) è registrato ma non ancora abilitato. Un
                amministratore deve autorizzarti come socio.
              </p>
            </div>
          ) : (
            <Outlet />
          )}
        </main>
      </div>
    </div>
  );
}
