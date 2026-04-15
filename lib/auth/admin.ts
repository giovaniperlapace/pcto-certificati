import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const getAuthContext = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      user: null,
      isAdmin: false,
      supabase,
    };
  }

  const { data: roleRows } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin");

  return {
    user,
    isAdmin: (roleRows?.length ?? 0) > 0,
    supabase,
  };
});

export async function requireAdmin(nextPath = "/admin") {
  const context = await getAuthContext();

  if (!context.user) {
    redirect(`/entra?next=${encodeURIComponent(nextPath)}`);
  }

  if (!context.isAdmin) {
    redirect("/?auth=forbidden");
  }

  return context;
}

export async function assertAdmin() {
  const context = await getAuthContext();

  if (!context.user || !context.isAdmin) {
    throw new Error("Non autorizzato.");
  }

  return context;
}
