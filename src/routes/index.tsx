import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sign in — Lookup App" },
      { name: "description", content: "Sign in with Google to get your unique lookup ID." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/search" });
    });
  }, [navigate]);

  const handleGoogle = async () => {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/search",
    });
    if (result.error) {
      toast.error("Sign-in failed");
      setLoading(false);
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/search" });
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-sm text-center">
        <h1 className="text-3xl font-bold tracking-tight">Welcome</h1>
        <p className="mt-2 text-muted-foreground">
          Sign in with Google to get your unique lookup ID.
        </p>
        <Button onClick={handleGoogle} disabled={loading} size="lg" className="mt-6 w-full">
          {loading ? "Redirecting…" : "Sign in with Google"}
        </Button>
      </div>
    </main>
  );
}
