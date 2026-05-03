import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";

export function RequireAuth({ children, redirect }: { children: React.ReactNode; redirect: string }) {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth", search: { redirect } });
  }, [loading, user, nav, redirect]);
  if (loading || !user)
    return <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">…</div>;
  return <>{children}</>;
}
