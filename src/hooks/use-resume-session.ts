import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

// Navigation only: the authenticated route and database policies still verify access.
// INITIAL_SESSION waits for Supabase to restore/refresh its persisted session.
export function useResumeSession() {
  const navigate = useNavigate();
  const [hasSession, setHasSession] = useState(false);
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setHasSession(!!session);
    });
    return () => data.subscription.unsubscribe();
  }, []);
  // Keep navigation outside the auth callback to avoid holding its refresh lock.
  useEffect(() => {
    if (hasSession) void navigate({ to: "/dashboard", replace: true });
  }, [hasSession, navigate]);
}
