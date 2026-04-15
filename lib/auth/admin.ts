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
      coordinator: null,
      isCoordinator: false,
      supabase,
    };
  }

  const [{ data: roleRows }, { data: coordinator }] = await Promise.all([
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin"),
    supabase
      .from("coordinators")
      .select("id, first_name, last_name, email, is_active")
      .eq("auth_user_id", user.id)
      .eq("is_active", true)
      .maybeSingle(),
  ]);

  return {
    user,
    isAdmin: (roleRows?.length ?? 0) > 0,
    coordinator,
    isCoordinator: Boolean(coordinator),
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

export async function requireCoordinator(nextPath = "/coordinatore") {
  const context = await getAuthContext();

  if (!context.user) {
    redirect(
      `/entra?next=${encodeURIComponent(nextPath)}&access_mode=coordinator`,
    );
  }

  if (!context.isCoordinator) {
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
