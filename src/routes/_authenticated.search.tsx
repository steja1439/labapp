import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getMyProfile, lookupUser } from "@/lib/profile.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Copy, LogOut, Search } from "lucide-react";

export const Route = createFileRoute("/_authenticated/search")({
  head: () => ({
    meta: [
      { title: "Search User — Lookup App" },
      { name: "description", content: "Find a user by their unique generated ID." },
    ],
  }),
  component: SearchPage,
});

type Me = { unique_id: string; name: string | null; email: string | null; photo_url: string | null } | null;
type LookupResult =
  | { found: true; user: { unique_id: string; name: string | null; email: string | null; photo_url: string | null } }
  | { found: false }
  | null;

function SearchPage() {
  const navigate = useNavigate();
  const fetchMe = useServerFn(getMyProfile);
  const fetchLookup = useServerFn(lookupUser);

  const [me, setMe] = useState<Me>(null);
  const [checking, setChecking] = useState(true);
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<LookupResult>(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        navigate({ to: "/" });
        return;
      }
      try {
        const profile = await fetchMe();
        if (active) setMe(profile as Me);
      } catch {
        navigate({ to: "/" });
      } finally {
        if (active) setChecking(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [fetchMe, navigate]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setResult(null);
    try {
      const r = await fetchLookup({ data: { uniqueId: query.trim() } });
      setResult(r as LookupResult);
    } catch {
      toast.error("Search failed");
    } finally {
      setSearching(false);
    }
  };

  const copyId = async () => {
    if (!me) return;
    await navigator.clipboard.writeText(me.unique_id);
    toast.success("ID copied");
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto w-full max-w-xl space-y-6">
        {me && (
          <section className="rounded-2xl border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-4">
              {me.photo_url && (
                <img
                  src={me.photo_url}
                  alt={me.name ?? "Profile photo"}
                  className="h-14 w-14 rounded-full object-cover"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-lg font-semibold">{me.name ?? "Unnamed"}</p>
                <p className="truncate text-sm text-muted-foreground">{me.email}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={signOut} aria-label="Sign out">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
            <div className="mt-4 flex items-center justify-between rounded-lg bg-muted px-3 py-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Your ID</p>
                <p className="font-mono text-base">{me.unique_id}</p>
              </div>
              <Button variant="outline" size="sm" onClick={copyId}>
                <Copy className="mr-2 h-3.5 w-3.5" /> Copy
              </Button>
            </div>
          </section>
        )}

        <section className="rounded-2xl border bg-card p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Find a user</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter a generated ID to look up a registered user.
          </p>
          <form onSubmit={handleSearch} className="mt-4 flex gap-2">
            <Input
              placeholder="Enter Generated ID"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <Button type="submit" disabled={searching}>
              <Search className="mr-2 h-4 w-4" />
              {searching ? "…" : "Submit"}
            </Button>
          </form>

          {result && (
            <div className="mt-6">
              {result.found ? (
                <div className="flex items-center gap-4 rounded-xl border p-4">
                  {result.user.photo_url && (
                    <img
                      src={result.user.photo_url}
                      alt={result.user.name ?? "User"}
                      className="h-12 w-12 rounded-full object-cover"
                    />
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{result.user.name ?? "Unnamed"}</p>
                    <p className="truncate text-sm text-muted-foreground">{result.user.email}</p>
                    <p className="mt-1 font-mono text-xs text-muted-foreground">
                      {result.user.unique_id}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="rounded-lg bg-destructive/10 px-4 py-3 text-center font-medium text-destructive">
                  Try Again
                </p>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
