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

export async function listAuthUsersByIds(
  supabase: AdminClient,
  userIds: string[],
) {
  const pendingIds = new Set(userIds);
  const matchedUsers: { id: string; email?: string | null }[] = [];
  let page = 1;

  while (pendingIds.size > 0) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 200,
    });

    if (error) {
      throw error;
    }

    data.users.forEach((user) => {
      if (pendingIds.has(user.id)) {
        matchedUsers.push(user);
        pendingIds.delete(user.id);
      }
    });

    if (data.users.length < 200) {
      break;
    }

    page += 1;
  }

  return matchedUsers;
}
