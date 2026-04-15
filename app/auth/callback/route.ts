import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const MAGIC_LINK_NEXT_COOKIE = "pcto_magic_link_next";
const MAGIC_LINK_ACCESS_MODE_COOKIE = "pcto_magic_link_access_mode";

function getSafeRedirectPath(next: string | null) {
  if (!next || !next.startsWith("/")) {
    return "/";
  }

  return next;
}

function getCookieValue(cookieHeader: string | null, name: string) {
  const rawValue =
    cookieHeader
    ?.split(";")
    .map((value) => value.trim())
    .find((value) => value.startsWith(`${name}=`))
    ?.split("=")
    .slice(1)
    .join("=") ?? null;

  if (!rawValue) {
    return null;
  }

  try {
    return decodeURIComponent(rawValue);
  } catch {
    return rawValue;
  }
}

function getSafeAccessMode(value: string | null) {
  return value === "coordinator" ? "coordinator" : "admin";
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const cookieHeader = request.headers.get("cookie");
  const nextFromCookie = getCookieValue(cookieHeader, MAGIC_LINK_NEXT_COOKIE);
  const accessMode = getSafeAccessMode(
    requestUrl.searchParams.get("access_mode") ??
      getCookieValue(cookieHeader, MAGIC_LINK_ACCESS_MODE_COOKIE),
  );
  const next = getSafeRedirectPath(
    requestUrl.searchParams.get("next") ??
      nextFromCookie ??
      (accessMode === "coordinator" ? "/coordinatore" : "/admin"),
  );

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.email) {
        const response = NextResponse.redirect(
          new URL("/entra?error=auth_callback", requestUrl.origin),
        );
        response.cookies.delete(MAGIC_LINK_NEXT_COOKIE);
        response.cookies.delete(MAGIC_LINK_ACCESS_MODE_COOKIE);
        return response;
      }

      const adminSupabase = createAdminClient();
      const { data: matchingCoordinator } = await adminSupabase
        .from("coordinators")
        .select("id, auth_user_id")
        .ilike("email", user.email)
        .eq("is_active", true)
        .maybeSingle();

      if (matchingCoordinator && matchingCoordinator.auth_user_id !== user.id) {
        const { error: coordinatorUpdateError } = await adminSupabase
          .from("coordinators")
          .update({ auth_user_id: user.id })
          .eq("id", matchingCoordinator.id);

        if (coordinatorUpdateError) {
          const response = NextResponse.redirect(
            new URL("/entra?error=auth_callback", requestUrl.origin),
          );
          response.cookies.delete(MAGIC_LINK_NEXT_COOKIE);
          response.cookies.delete(MAGIC_LINK_ACCESS_MODE_COOKIE);
          return response;
        }
      }

      const [{ data: roleRows }, { data: coordinator }] = await Promise.all([
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin"),
        supabase
          .from("coordinators")
          .select("id")
          .eq("auth_user_id", user.id)
          .eq("is_active", true)
          .maybeSingle(),
      ]);

      if (accessMode === "admin" && (roleRows?.length ?? 0) === 0) {
        const response = NextResponse.redirect(
          new URL(
            "/entra?error=Questa%20utenza%20non%20ha%20accesso%20admin.&access_mode=admin",
            requestUrl.origin,
          ),
        );
        response.cookies.delete(MAGIC_LINK_NEXT_COOKIE);
        response.cookies.delete(MAGIC_LINK_ACCESS_MODE_COOKIE);
        return response;
      }

      if (accessMode === "coordinator" && !coordinator) {
        const response = NextResponse.redirect(
          new URL(
            "/entra?error=Questa%20utenza%20non%20ha%20accesso%20coordinatore.&access_mode=coordinator",
            requestUrl.origin,
          ),
        );
        response.cookies.delete(MAGIC_LINK_NEXT_COOKIE);
        response.cookies.delete(MAGIC_LINK_ACCESS_MODE_COOKIE);
        return response;
      }

      const response = NextResponse.redirect(new URL(next, requestUrl.origin));
      response.cookies.delete(MAGIC_LINK_NEXT_COOKIE);
      response.cookies.delete(MAGIC_LINK_ACCESS_MODE_COOKIE);
      return response;
    }
  }

  const response = NextResponse.redirect(
    new URL("/entra?error=auth_callback", requestUrl.origin),
  );
  response.cookies.delete(MAGIC_LINK_NEXT_COOKIE);
  response.cookies.delete(MAGIC_LINK_ACCESS_MODE_COOKIE);
  return response;
}
