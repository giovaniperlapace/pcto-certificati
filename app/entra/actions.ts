"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getBaseUrl } from "@/lib/utils/request-url";
import { readOptionalString, readRequiredString } from "@/lib/utils/form-data";

export async function sendMagicLinkAction(formData: FormData) {
  const supabase = await createClient();
  const email = readRequiredString(formData, "email");
  const next = readOptionalString(formData, "next") ?? "/admin";
  const safeNext = next.startsWith("/") ? next : "/admin";
  const baseUrl = await getBaseUrl();

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${baseUrl}/auth/callback?next=${encodeURIComponent(safeNext)}`,
    },
  });

  if (error) {
    redirect(
      `/entra?error=${encodeURIComponent("Impossibile inviare il Magic Link. Riprova.")}&next=${encodeURIComponent(safeNext)}`,
    );
  }

  redirect(`/entra?sent=1&next=${encodeURIComponent(safeNext)}`);
}
