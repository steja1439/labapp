import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("profiles")
      .select("unique_id, name, email, google_id, photo_url")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

export const lookupUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ uniqueId: z.string().trim().min(1).max(64) }).parse(input),
  )
  .handler(async ({ data }) => {
    // Use admin client so users can look up other profiles by unique_id
    // (RLS only allows reading own row). We expose only safe public fields.
    const { data: row, error } = await supabaseAdmin
      .from("profiles")
      .select("unique_id, name, email, photo_url")
      .eq("unique_id", data.uniqueId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return { found: false as const };
    return { found: true as const, user: row };
  });
