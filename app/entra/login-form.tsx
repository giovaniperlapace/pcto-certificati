"use client";

import { useState } from "react";
import { FlashMessage } from "@/components/admin/flash-message";
import type { AccessMode } from "@/lib/auth/login-access";

type LoginFormProps = {
  accessMode: AccessMode;
  error: string | null;
  next: string;
  success: string | null;
};

function getErrorMessage(code: string, fallback?: string) {
  switch (code) {
    case "EMAIL_REQUIRED":
      return "Inserisci un indirizzo email valido.";
    case "ACCESS_MODE_INVALID":
      return "Tipo di accesso non valido.";
    case "COORDINATOR_NOT_FOUND":
      return "Questa email non e' associata a un coordinatore attivo.";
    case "ADMIN_NOT_FOUND":
      return "Questa email non e' abilitata all'accesso admin.";
    case "RATE_LIMITED":
      return "Abbiamo appena inviato un Magic Link a questa email. Attendi un minuto e riprova.";
    case "CHECK_FAILED":
      return "Impossibile verificare l'accesso. Riprova.";
    case "MAGIC_LINK_FAILED":
      return "Impossibile inviare il Magic Link. Riprova.";
    default:
      return fallback || "Impossibile inviare il Magic Link. Riprova.";
  }
}

export function LoginForm(props: LoginFormProps) {
  const [accessMode, setAccessMode] = useState<AccessMode>(props.accessMode);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">(
    props.success ? "sent" : props.error ? "error" : "idle",
  );
  const [message, setMessage] = useState<string | null>(
    props.success ?? props.error,
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage(null);

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setStatus("error");
      setMessage("Inserisci un indirizzo email valido.");
      return;
    }

    try {
      const response = await fetch("/api/auth/login/magic-link", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          access_mode: accessMode,
          email: normalizedEmail,
          next: props.next,
        }),
      });

      if (!response.ok) {
        const json = (await response.json().catch(() => null)) as
          | { code?: string; message?: string }
          | null;
        setStatus("error");
        setMessage(getErrorMessage(json?.code ?? "", json?.message));
        return;
      }

      setStatus("sent");
      setMessage("Magic Link inviato. Apri l'email e completa l'accesso.");
    } catch {
      setStatus("error");
      setMessage("Impossibile inviare il Magic Link. Riprova.");
    }
  }

  return (
    <div className="space-y-6">
      <FlashMessage
        error={status === "error" ? message : null}
        success={status === "sent" ? message : null}
      />

      <form onSubmit={handleSubmit} className="space-y-5">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-zinc-800">Email</span>
          <input
            required
            type="email"
            name="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="e-mail"
            className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-950"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-zinc-800">
            Tipo di accesso
          </span>
          <select
            name="access_mode"
            value={accessMode}
            onChange={(event) => setAccessMode(event.target.value as AccessMode)}
            className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-950"
          >
            <option value="coordinator">Coordinatore</option>
            <option value="admin">Admin</option>
          </select>
          <p className="text-xs leading-5 text-zinc-500">
            Scegli `Admin` solo se il coordinatore e&apos; stato abilitato anche
            con privilegi amministrativi.
          </p>
        </label>

        <button
          type="submit"
          disabled={status === "loading"}
          className="inline-flex items-center justify-center rounded-full bg-zinc-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-wait disabled:opacity-70 disabled:hover:bg-zinc-950"
        >
          {status === "loading"
            ? "Invio Magic Link in corso..."
            : "Invia Magic Link"}
        </button>
      </form>
    </div>
  );
}
