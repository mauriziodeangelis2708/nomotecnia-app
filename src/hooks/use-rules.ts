import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Rule, RuleMap } from "@/lib/engine";

export function useRules() {
  return useQuery({
    queryKey: ["rules"],
    queryFn: async () => {
      const { data, error } = await supabase.from("rules").select("*").order("sort");
      if (error) throw error;
      const list = (data ?? []) as unknown as Rule[];
      const map: RuleMap = {};
      for (const r of list) map[r.key] = { ...r, value: r.value === null ? null : Number(r.value) };
      return { list, map };
    },
  });
}

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id);
      const r = (roles ?? []).map((x) => x.role);
      return { id: u.user.id, email: u.user.email ?? "", isAdmin: r.includes("admin"), isMember: r.length > 0 };
    },
  });
}
