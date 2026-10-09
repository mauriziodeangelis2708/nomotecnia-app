import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Rule, RuleMap } from "@/lib/engine";
import { OFFICIAL_RULES } from "@/lib/bando";

export function useRules() {
  return useQuery({
    queryKey: ["rules"],
    queryFn: async () => {
      const { data, error } = await supabase.from("rules").select("*").order("sort");
      if (error) throw error;
      const stored = (data ?? []) as unknown as Rule[];
      const map: RuleMap = { ...OFFICIAL_RULES };
      for (const r of stored)
        map[r.key] = { ...r, value: r.value === null ? null : Number(r.value) };
      const list = Object.values(map).filter((r): r is Rule => !!r);
      return { list, map, storedKeys: stored.map((r) => r.key) };
    },
  });
}

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const { data: u, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!u.user) return null;
      const { data: roles, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", u.user.id);
      if (error) throw error;
      const r = (roles ?? []).map((x) => x.role);
      return {
        id: u.user.id,
        email: u.user.email ?? "",
        isAdmin: r.includes("admin"),
        isMember: r.length > 0,
      };
    },
  });
}
