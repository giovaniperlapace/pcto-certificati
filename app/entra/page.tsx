import { redirect } from "next/navigation";
import { FlashMessage } from "@/components/admin/flash-message";
import { PendingSubmitButton } from "@/components/ui/pending-submit-button";
import { getAuthContext } from "@/lib/auth/admin";
import { sendMagicLinkAction } from "@/app/entra/actions";

type SignInPageProps = {
  searchParams: Promise<{
    error?: string;
    next?: string;
    sent?: string;
    access_mode?: string;
  }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const [{ user, isAdmin, isCoordinator }, params] = await Promise.all([
    getAuthContext(),
    searchParams,
  ]);

  const accessMode = params.access_mode === "admin" ? "admin" : "coordinator";

  if (user && accessMode === "admin" && isAdmin) {
    redirect("/admin");
  }

  if (user && accessMode === "coordinator" && isCoordinator) {
    redirect("/coordinatore");
  }

  const next = params.next?.startsWith("/")
    ? params.next
    : accessMode === "coordinator"
      ? "/coordinatore"
      : "/admin";
  const success =
    params.sent === "1"
      ? "Magic Link inviato. Apri l'email e completa l'accesso."
      : null;
  const error =
    params.error === "auth_callback"
      ? "Impossibile completare l'accesso dal Magic Link. Riprova."
      : params.error ?? null;

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-24">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-10 lg:flex-row lg:items-start">
        <div className="w-full max-w-xl space-y-5">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">
            Accesso
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-zinc-950">
            Entra con Magic Link.
          </h1>
          <p className="text-base leading-7 text-zinc-600">
            Puoi scegliere se accedere come coordinatore o come admin. L&apos;app
            verifica il ruolo associato alla tua email prima di inviare il Magic
            Link, cosi&apos; l&apos;esperienza resta coerente con i privilegi disponibili.
          </p>
        </div>

        <section className="w-full max-w-xl rounded-[2rem] border border-zinc-200 bg-white p-8 shadow-sm">
          <div className="space-y-6">
            <FlashMessage error={error} success={success} />

            <form action={sendMagicLinkAction} className="space-y-5">
              <input type="hidden" name="next" value={next} />

              <label className="block space-y-2">
                <span className="text-sm font-medium text-zinc-800">
                  Email
                </span>
                <input
                  required
                  type="email"
                  name="email"
                  placeholder="info@giovaniperlapace.it"
                  className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-950"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-zinc-800">
                  Tipo di accesso
                </span>
                <select
                  name="access_mode"
                  defaultValue={accessMode}
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

              <PendingSubmitButton
                className="inline-flex items-center justify-center rounded-full bg-zinc-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:hover:bg-zinc-950"
                idleLabel="Invia Magic Link"
                pendingLabel="Invio Magic Link in corso..."
              />
            </form>
          </div>
        </section>
      </section>
    </main>
  );
}
