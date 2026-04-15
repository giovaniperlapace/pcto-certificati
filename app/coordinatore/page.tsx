import Link from "next/link";
import { signOutAction } from "@/app/admin/actions";
import { requireCoordinator } from "@/lib/auth/admin";

export default async function CoordinatorPage() {
  const { coordinator, isAdmin, supabase } = await requireCoordinator(
    "/coordinatore",
  );

  if (!coordinator) {
    throw new Error("Coordinatore non disponibile.");
  }

  const { data: assignments, error } = await supabase
    .from("service_coordinators")
    .select(
      "is_primary, receives_new_request_notifications, services(id, name, weekday, schedule_label, address, city, is_active)",
    )
    .eq("coordinator_id", coordinator.id);

  if (error) {
    throw error;
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-10">
      <section className="mx-auto max-w-6xl space-y-8">
        <div className="flex flex-col gap-4 border-b border-zinc-200 pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">
              Coordinatore
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
              {coordinator.first_name} {coordinator.last_name}
            </h1>
            <p className="max-w-3xl text-sm leading-6 text-zinc-600">
              Questa area mostra i servizi assegnati al coordinatore e prepara il
              terreno per il flusso di revisione richieste.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {isAdmin ? (
              <Link
                href="/admin"
                className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:border-zinc-950 hover:text-zinc-950"
              >
                Vai all&apos;area admin
              </Link>
            ) : null}
            <form action={signOutAction}>
              <button
                type="submit"
                className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:border-zinc-950 hover:text-zinc-950"
              >
                Esci
              </button>
            </form>
          </div>
        </div>

        <section className="rounded-[1.75rem] border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 pb-4">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-zinc-950">
                Servizi assegnati
              </h2>
              <p className="mt-1 text-sm text-zinc-600">
                Qui vedrai i servizi di cui sei referente e, nelle prossime fasi,
                anche le richieste di certificato da revisionare.
              </p>
            </div>

            <div className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-700">
              <span className="font-semibold text-zinc-950">
                {assignments.length}
              </span>{" "}
              servizi collegati
            </div>
          </div>

          <div className="mt-5 grid gap-4">
            {assignments.length === 0 ? (
              <article className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
                Nessun servizio assegnato al momento. Quando un admin colleghera&apos;
                questo coordinatore a uno o piu&apos; servizi, compariranno qui.
              </article>
            ) : (
              assignments.map((assignment) => {
                const service =
                  Array.isArray(assignment.services)
                    ? assignment.services[0]
                    : assignment.services;

                if (!service) {
                  return null;
                }

                return (
                  <article
                    key={service.id}
                    className="rounded-2xl border border-zinc-200 p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <h3 className="text-lg font-semibold text-zinc-950">
                          {service.name}
                        </h3>
                        <p className="text-sm text-zinc-600">
                          {service.weekday} - {service.schedule_label}
                        </p>
                        <p className="text-sm text-zinc-500">
                          {service.address}, {service.city}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <span
                          className={[
                            "rounded-full border px-2.5 py-1 text-xs font-medium",
                            service.is_active
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-zinc-200 bg-zinc-100 text-zinc-700",
                          ].join(" ")}
                        >
                          {service.is_active ? "Attivo" : "Disattivato"}
                        </span>
                        {assignment.is_primary ? (
                          <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700">
                            Principale
                          </span>
                        ) : null}
                        {assignment.receives_new_request_notifications ? (
                          <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-medium text-zinc-700">
                            Riceve notifiche
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
