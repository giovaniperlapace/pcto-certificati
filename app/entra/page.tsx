import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/admin";
import { LoginForm } from "@/app/entra/login-form";

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
            Puoi scegliere se accedere come coordinatore o come admin.
          </p>
        </div>

        <section className="w-full max-w-xl rounded-[2rem] border border-zinc-200 bg-white p-8 shadow-sm">
          <LoginForm
            accessMode={accessMode}
            error={error}
            next={next}
            success={success}
          />
        </section>
      </section>
    </main>
  );
}
