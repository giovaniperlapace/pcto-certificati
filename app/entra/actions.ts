"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createAdminClient, findAuthUserByEmail } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getBaseUrl } from "@/lib/utils/request-url";
import { readOptionalString, readRequiredString } from "@/lib/utils/form-data";

const MAGIC_LINK_NEXT_COOKIE = "pcto_magic_link_next";
const MAGIC_LINK_ACCESS_MODE_COOKIE = "pcto_magic_link_access_mode";

function getSafeAccessMode(value: string | null) {
  return value === "coordinator" ? "coordinator" : "admin";
}

function getDefaultNextPath(accessMode: "admin" | "coordinator") {
  return accessMode === "coordinator" ? "/coordinatore" : "/admin";
}

function resolveNextPath(
  next: string | null,
  accessMode: "admin" | "coordinator",
) {
  const defaultNextPath = getDefaultNextPath(accessMode);

  if (!next || !next.startsWith("/")) {
    return defaultNextPath;
  }

  if (accessMode === "coordinator" && next === "/admin") {
    return "/coordinatore";
  }

  if (accessMode === "admin" && next === "/coordinatore") {
    return "/admin";
  }

  return next;
}

export async function sendMagicLinkAction(formData: FormData) {
  const supabase = await createClient();
  const adminSupabase = createAdminClient();
  const cookieStore = await cookies();
  const email = readRequiredString(formData, "email");
  const accessMode = getSafeAccessMode(readOptionalString(formData, "access_mode"));
  const next = readOptionalString(formData, "next");
  const safeNext = resolveNextPath(next, accessMode);
  const baseUrl = await getBaseUrl();
  const callbackUrl = new URL("/auth/callback", baseUrl);

  if (accessMode === "coordinator") {
    const { data: coordinator, error: coordinatorError } = await adminSupabase
      .from("coordinators")
      .select("id")
      .ilike("email", email)
      .eq("is_active", true)
      .maybeSingle();

    if (coordinatorError) {
      redirect(
        `/entra?error=${encodeURIComponent("Impossibile verificare l'accesso coordinatore.")}&access_mode=${accessMode}&next=${encodeURIComponent(safeNext)}`,
      );
    }

    if (!coordinator) {
      redirect(
        `/entra?error=${encodeURIComponent("Questa email non e' associata a un coordinatore attivo.")}&access_mode=${accessMode}&next=${encodeURIComponent(safeNext)}`,
      );
    }
  } else {
    const authUser = await findAuthUserByEmail(adminSupabase, email);

    if (!authUser) {
      redirect(
        `/entra?error=${encodeURIComponent("Questa email non e' abilitata all'accesso admin.")}&access_mode=${accessMode}&next=${encodeURIComponent(safeNext)}`,
      );
    }

    const { data: roleRows, error: roleError } = await adminSupabase
      .from("user_roles")
      .select("role")
      .eq("user_id", authUser.id)
      .eq("role", "admin");

    if (roleError) {
      redirect(
        `/entra?error=${encodeURIComponent("Impossibile verificare il ruolo admin.")}&access_mode=${accessMode}&next=${encodeURIComponent(safeNext)}`,
      );
    }

    if ((roleRows?.length ?? 0) === 0) {
      redirect(
        `/entra?error=${encodeURIComponent("Questa email non e' abilitata all'accesso admin.")}&access_mode=${accessMode}&next=${encodeURIComponent(safeNext)}`,
      );
    }
  }

  cookieStore.set(MAGIC_LINK_NEXT_COOKIE, safeNext, {
    httpOnly: true,
    sameSite: "lax",
    secure: callbackUrl.protocol === "https:",
    path: "/",
    maxAge: 60 * 15,
  });
  cookieStore.set(MAGIC_LINK_ACCESS_MODE_COOKIE, accessMode, {
    httpOnly: true,
    sameSite: "lax",
    secure: callbackUrl.protocol === "https:",
    path: "/",
    maxAge: 60 * 15,
  });

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: callbackUrl.toString(),
    },
  });

  if (error) {
    redirect(
      `/entra?error=${encodeURIComponent("Impossibile inviare il Magic Link. Riprova.")}&access_mode=${accessMode}&next=${encodeURIComponent(safeNext)}`,
    );
  }

  redirect(
    `/entra?sent=1&access_mode=${accessMode}&next=${encodeURIComponent(safeNext)}`,
  );
}
