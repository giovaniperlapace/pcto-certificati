import { FlashMessage } from "@/components/admin/flash-message";
import { PageHeader } from "@/components/admin/page-header";
import { upsertCoordinatorAction } from "@/app/admin/actions";
import { requireAdmin } from "@/lib/auth/admin";

type CoordinatorsPageProps = {
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

export default async function CoordinatorsPage({
  searchParams,
}: CoordinatorsPageProps) {
  const [{ supabase }, params] = await Promise.all([
    requireAdmin("/admin/coordinatori"),
    searchParams,
  ]);

  const { data: coordinators, error } = await supabase
    .from("coordinators")
    .select("*")
    .order("last_name", { ascending: true });

  if (error) {
    throw error;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Admin"
        title="Coordinatori"
        description="Crea i coordinatori che useranno il Magic Link e mantieni attivi solo quelli che devono continuare a gestire i servizi."
      />

      <FlashMessage error={params.error ?? null} success={params.success ?? null} />

      <section className="rounded-[1.75rem] border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold tracking-tight text-zinc-950">
            Nuovo coordinatore
          </h2>
          <form
            action={upsertCoordinatorAction}
            className="grid gap-4 md:grid-cols-2"
          >
            <input type="hidden" name="redirect_to" value="/admin/coordinatori" />

            <label className="space-y-2">
              <span className="text-sm font-medium text-zinc-800">Nome</span>
              <input
                required
                name="first_name"
                className="w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm outline-none focus:border-zinc-950"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-zinc-800">Cognome</span>
              <input
                required
                name="last_name"
                className="w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm outline-none focus:border-zinc-950"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-zinc-800">Email</span>
              <input
                required
                type="email"
                name="email"
                className="w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm outline-none focus:border-zinc-950"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-zinc-800">Telefono</span>
              <input
                name="phone"
                className="w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm outline-none focus:border-zinc-950"
              />
            </label>

            <label className="flex items-center gap-3 rounded-2xl border border-zinc-200 px-4 py-3 text-sm text-zinc-700 md:col-span-2">
              <input defaultChecked type="checkbox" name="is_active" />
              Coordinatore attivo
            </label>

            <div className="md:col-span-2">
              <button
                type="submit"
                className="rounded-full bg-zinc-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-800"
              >
                Salva coordinatore
              </button>
            </div>
          </form>
        </div>
      </section>

      <section className="space-y-4">
        {coordinators.map((coordinator) => (
          <article
            key={coordinator.id}
            className="rounded-[1.75rem] border border-zinc-200 bg-white p-6 shadow-sm"
          >
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-zinc-950">
                  {coordinator.first_name} {coordinator.last_name}
                </h2>
                <p className="text-sm text-zinc-600">{coordinator.email}</p>
              </div>
              <span
                className={[
                  "rounded-full px-3 py-1 text-xs font-medium",
                  coordinator.is_active
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-zinc-200 text-zinc-600",
                ].join(" ")}
              >
                {coordinator.is_active ? "Attivo" : "Disattivato"}
              </span>
            </div>

            <form
              action={upsertCoordinatorAction}
              className="grid gap-4 md:grid-cols-2"
            >
              <input type="hidden" name="redirect_to" value="/admin/coordinatori" />
              <input type="hidden" name="id" value={coordinator.id} />

              <label className="space-y-2">
                <span className="text-sm font-medium text-zinc-800">Nome</span>
                <input
                  required
                  name="first_name"
                  defaultValue={coordinator.first_name}
                  className="w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm outline-none focus:border-zinc-950"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-zinc-800">Cognome</span>
                <input
                  required
                  name="last_name"
                  defaultValue={coordinator.last_name}
                  className="w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm outline-none focus:border-zinc-950"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-zinc-800">Email</span>
                <input
                  required
                  type="email"
                  name="email"
                  defaultValue={coordinator.email}
                  className="w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm outline-none focus:border-zinc-950"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-zinc-800">Telefono</span>
                <input
                  name="phone"
                  defaultValue={coordinator.phone ?? ""}
                  className="w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm outline-none focus:border-zinc-950"
                />
              </label>

              <label className="flex items-center gap-3 rounded-2xl border border-zinc-200 px-4 py-3 text-sm text-zinc-700 md:col-span-2">
                <input
                  defaultChecked={coordinator.is_active}
                  type="checkbox"
                  name="is_active"
                />
                Coordinatore attivo
              </label>

              <div className="md:col-span-2">
                <button
                  type="submit"
                  className="rounded-full bg-zinc-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-800"
                >
                  Aggiorna coordinatore
                </button>
              </div>
            </form>
          </article>
        ))}
      </section>
    </div>
  );
}
