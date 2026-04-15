import { createClient } from "@supabase/supabase-js";
import { getSupabaseServiceRoleEnv } from "@/lib/supabase/env";
import type { Database } from "@/lib/supabase/database.types";

type AdminClient = ReturnType<typeof createAdminClient>;

export function createAdminClient() {
  const { url, serviceRoleKey } = getSupabaseServiceRoleEnv();

  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function findAuthUserByEmail(
  supabase: AdminClient,
  email: string,
) {
  const normalizedEmail = email.trim().toLowerCase();
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 200,
    });

    if (error) {
      throw error;
    }

    const user =
      data.users.find(
        (candidate) => candidate.email?.trim().toLowerCase() === normalizedEmail,
      ) ?? null;

    if (user) {
      return user;
    }

    if (data.users.length < 200) {
      return null;
    }

    page += 1;
  }
}

export async function ensureAuthUserForEmail(
  supabase: AdminClient,
  email: string,
  authUserId?: string | null,
) {
  const existingUser = await findAuthUserByEmail(supabase, email);

  if (existingUser) {
    return existingUser.id;
  }

  if (authUserId) {
    const { data, error } = await supabase.auth.admin.updateUserById(authUserId, {
      email,
      email_confirm: true,
    });

    if (error) {
      throw error;
    }

    return data.user.id;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
  });

  if (error) {
    throw error;
  }

  return data.user.id;
}
