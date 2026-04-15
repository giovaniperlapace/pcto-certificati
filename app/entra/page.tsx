import { redirect } from "next/navigation";
import { FlashMessage } from "@/components/admin/flash-message";
import { getAuthContext } from "@/lib/auth/admin";
import { sendMagicLinkAction } from "@/app/entra/actions";

type SignInPageProps = {
  searchParams: Promise<{
    error?: string;
    next?: string;
    sent?: string;
  }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const [{ user, isAdmin }, params] = await Promise.all([
    getAuthContext(),
    searchParams,
  ]);

  if (user && isAdmin) {
    redirect("/admin");
  }

  const next = params.next?.startsWith("/") ? params.next : "/admin";
  const success =
    params.sent === "1"
      ? "Magic Link inviato. Apri l'email e completa l'accesso."
      : null;

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-24">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-10 lg:flex-row lg:items-start">
        <div className="w-full max-w-xl space-y-5">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">
            Accesso
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-zinc-950">
            Entra nell&apos;area amministrativa.
          </h1>
          <p className="text-base leading-7 text-zinc-600">
            Usa il tuo indirizzo email per ricevere un Magic Link. L&apos;accesso
            all&apos;area admin resta comunque limitato agli utenti che hanno il
            ruolo `admin` in Supabase.
          </p>
        </div>

        <section className="w-full max-w-xl rounded-[2rem] border border-zinc-200 bg-white p-8 shadow-sm">
          <div className="space-y-6">
            <FlashMessage error={params.error ?? null} success={success} />

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

              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-full bg-zinc-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-800"
              >
                Invia Magic Link
              </button>
            </form>
          </div>
        </section>
      </section>
    </main>
  );
}
