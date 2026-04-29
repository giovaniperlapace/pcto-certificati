import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import {
  checkLoginAccess,
  resolveNextPath,
  type AccessMode,
} from "@/lib/auth/login-access";
import { sendGmailEmail } from "@/lib/email/gmail";
import { createAdminClient, ensureAuthUserForEmail } from "@/lib/supabase/admin";
import { getSupabaseServiceRoleEnv } from "@/lib/supabase/env";

type MagicLinkBody = {
  access_mode?: unknown;
  email?: unknown;
  next?: unknown;
};

type GenerateLinkResponse = {
  error?: string;
  error_description?: string;
  hashed_token?: string;
  msg?: string;
  verification_type?: EmailOtpType;
};

const MAGIC_LINK_NEXT_COOKIE = "pcto_magic_link_next";
const MAGIC_LINK_ACCESS_MODE_COOKIE = "pcto_magic_link_access_mode";
const requestTimestampsByEmail = new Map<string, number>();
const REQUEST_INTERVAL_MS = 60_000;

function getAppBaseUrl(request: Request): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, "");
  if (configured) return configured;

  const origin = request.headers.get("origin") || new URL(request.url).origin;
  return origin.replace(/\/+$/, "");
}

function getErrorMessage(payload: GenerateLinkResponse): string {
  return (
    payload.msg ||
    payload.error_description ||
    payload.error ||
    "Impossibile generare il Magic Link"
  );
}

async function generateMagicLinkToken(email: string): Promise<{
  tokenHash: string;
  type: EmailOtpType;
}> {
  const { url, serviceRoleKey } = getSupabaseServiceRoleEnv();
  const response = await fetch(
    `${url.replace(/\/+$/, "")}/auth/v1/admin/generate_link`,
    {
      method: "POST",
      headers: {
        accept: "application/json",
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        type: "magiclink",
        email,
      }),
    },
  );

  const payload = (await response.json().catch(() => ({}))) as GenerateLinkResponse;
  if (!response.ok || !payload.hashed_token || !payload.verification_type) {
    throw new Error(getErrorMessage(payload));
  }

  return {
    tokenHash: payload.hashed_token,
    type: payload.verification_type,
  };
}

function buildCallbackUrl(
  request: Request,
  input: {
    accessMode: AccessMode;
    next: string;
    tokenHash: string;
    type: EmailOtpType;
  },
): string {
  const callbackUrl = new URL("/auth/callback", getAppBaseUrl(request));
  callbackUrl.searchParams.set("token_hash", input.tokenHash);
  callbackUrl.searchParams.set("type", input.type);
  callbackUrl.searchParams.set("access_mode", input.accessMode);
  callbackUrl.searchParams.set("next", input.next);
  return callbackUrl.toString();
}

function buildEmailHtml(link: string, accessMode: AccessMode): string {
  const areaLabel = accessMode === "admin" ? "area admin" : "area coordinatore";

  return `
    <div style="font-family: Arial, sans-serif; color: #18181b; line-height: 1.55;">
      <h1 style="font-size: 20px; margin: 0 0 16px;">Accesso certificati PCTO e volontariato</h1>
      <p>Hai richiesto di entrare nella piattaforma certificati di <strong>Giovani per la Pace</strong>.</p>
      <p>Il link qui sotto apre in modo sicuro la tua <strong>${areaLabel}</strong>, dove puoi gestire richieste, certificati e invii email.</p>
      <p><strong>Clicca il pulsante per completare l'accesso:</strong></p>
      <p style="margin: 24px 0;">
        <a href="${link}" style="background: #18181b; color: #ffffff; padding: 11px 18px; border-radius: 999px; text-decoration: none; display: inline-block;">
          Entra nella piattaforma certificati
        </a>
      </p>
      <p>Se il pulsante non funziona, copia e incolla questo link nel browser:</p>
      <p style="word-break: break-all;"><a href="${link}">${link}</a></p>
      <p>Se usi Safari in modalita' privata e il login non si completa, prova con Chrome o con una finestra normale del browser.</p>
      <p style="margin-top: 24px;">Giovani per la Pace</p>
    </div>
  `.trim();
}

function buildEmailText(link: string, accessMode: AccessMode): string {
  const areaLabel = accessMode === "admin" ? "area admin" : "area coordinatore";

  return [
    "Accesso certificati PCTO e volontariato",
    "",
    "Hai richiesto di entrare nella piattaforma certificati di Giovani per la Pace.",
    `Il link qui sotto apre in modo sicuro la tua ${areaLabel}, dove puoi gestire richieste, certificati e invii email.`,
    "",
    "Clicca o copia questo link per completare l'accesso:",
    link,
    "",
    "Se usi Safari in modalita' privata e il login non si completa, prova con Chrome o con una finestra normale del browser.",
    "",
    "Giovani per la Pace",
  ].join("\n");
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as MagicLinkBody;
    const access = await checkLoginAccess(body.email, body.access_mode);
    if (!access.ok) {
      return NextResponse.json(
        { ok: false, code: access.code, message: access.message },
        { status: access.status },
      );
    }

    const safeNext = resolveNextPath(body.next, access.accessMode);
    const lastRequestAt = requestTimestampsByEmail.get(access.email) ?? 0;
    const now = Date.now();
    if (now - lastRequestAt < REQUEST_INTERVAL_MS) {
      return NextResponse.json(
        { ok: false, code: "RATE_LIMITED" },
        { status: 429 },
      );
    }

    const adminSupabase = createAdminClient();
    await ensureAuthUserForEmail(adminSupabase, access.email);

    const token = await generateMagicLinkToken(access.email);
    const link = buildCallbackUrl(request, {
      accessMode: access.accessMode,
      next: safeNext,
      tokenHash: token.tokenHash,
      type: token.type,
    });

    await sendGmailEmail({
      to: access.email,
      subject: "Accesso piattaforma certificati - Magic Link",
      text: buildEmailText(link, access.accessMode),
      html: buildEmailHtml(link, access.accessMode),
    });

    requestTimestampsByEmail.set(access.email, now);

    const response = NextResponse.json({ ok: true });
    const secure = getAppBaseUrl(request).startsWith("https://");
    response.cookies.set(MAGIC_LINK_NEXT_COOKIE, safeNext, {
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: "/",
      maxAge: 60 * 15,
    });
    response.cookies.set(MAGIC_LINK_ACCESS_MODE_COOKIE, access.accessMode, {
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: "/",
      maxAge: 60 * 15,
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        code: "MAGIC_LINK_FAILED",
        message:
          error instanceof Error
            ? error.message
            : "Impossibile inviare il Magic Link",
      },
      { status: 500 },
    );
  }
}
