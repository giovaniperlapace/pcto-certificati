import {
  createAdminClient,
  findAuthUserByEmail,
} from "@/lib/supabase/admin";

export type AccessMode = "admin" | "coordinator";

export type LoginAccessCheckResult =
  | {
      ok: true;
      accessMode: AccessMode;
      authUserId?: string | null;
      coordinatorId?: string | null;
      email: string;
    }
  | { ok: false; status: number; code: string; message?: string };

export function normalizeLoginEmail(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

export function parseAccessMode(value: unknown): AccessMode | null {
  if (value === "admin" || value === "coordinator") {
    return value;
  }

  return null;
}

export function getDefaultNextPath(accessMode: AccessMode) {
  return accessMode === "coordinator" ? "/coordinatore" : "/admin";
}

export function resolveNextPath(next: unknown, accessMode: AccessMode) {
  const value = typeof next === "string" ? next : null;
  const defaultNextPath = getDefaultNextPath(accessMode);

  if (!value || !value.startsWith("/")) {
    return defaultNextPath;
  }

  if (accessMode === "coordinator" && value === "/admin") {
    return "/coordinatore";
  }

  if (accessMode === "admin" && value === "/coordinatore") {
    return "/admin";
  }

  return value;
}

export async function checkLoginAccess(
  emailInput: unknown,
  accessModeInput: unknown,
): Promise<LoginAccessCheckResult> {
  const email = normalizeLoginEmail(emailInput);
  const accessMode = parseAccessMode(accessModeInput);

  if (!email) {
    return { ok: false, status: 400, code: "EMAIL_REQUIRED" };
  }

  if (!accessMode) {
    return { ok: false, status: 400, code: "ACCESS_MODE_INVALID" };
  }

  const adminSupabase = createAdminClient();

  if (accessMode === "coordinator") {
    const { data: coordinator, error } = await adminSupabase
      .from("coordinators")
      .select("id, auth_user_id")
      .ilike("email", email)
      .eq("is_active", true)
      .maybeSingle();

    if (error) {
      return {
        ok: false,
        status: 500,
        code: "CHECK_FAILED",
        message: error.message,
      };
    }

    if (!coordinator) {
      return { ok: false, status: 404, code: "COORDINATOR_NOT_FOUND" };
    }

    return {
      ok: true,
      accessMode,
      authUserId: coordinator.auth_user_id,
      coordinatorId: coordinator.id,
      email,
    };
  }

  const authUser = await findAuthUserByEmail(adminSupabase, email);

  if (!authUser) {
    return { ok: false, status: 404, code: "ADMIN_NOT_FOUND" };
  }

  const { data: roleRows, error } = await adminSupabase
    .from("user_roles")
    .select("role")
    .eq("user_id", authUser.id)
    .eq("role", "admin");

  if (error) {
    return {
      ok: false,
      status: 500,
      code: "CHECK_FAILED",
      message: error.message,
    };
  }

  if ((roleRows?.length ?? 0) === 0) {
    return { ok: false, status: 404, code: "ADMIN_NOT_FOUND" };
  }

  return {
    ok: true,
    accessMode,
    authUserId: authUser.id,
    email,
  };
}
