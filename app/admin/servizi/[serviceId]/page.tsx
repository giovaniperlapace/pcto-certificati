import Link from "next/link";
import { notFound } from "next/navigation";
import { CoordinatorSearchSelect } from "@/components/admin/coordinator-search-select";
import { FlashMessage } from "@/components/admin/flash-message";
import { PageHeader } from "@/components/admin/page-header";
import {
  addServiceCoordinatorAction,
  removeServiceCoordinatorAction,
  updateServiceCoordinatorAction,
} from "@/app/admin/actions";
import { requireAdmin } from "@/lib/auth/admin";

type ServiceAssignmentsPageProps = {
  params: Promise<{
    serviceId: string;
  }>;
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

export default async function ServiceAssignmentsPage({
  params,
  searchParams,
}: ServiceAssignmentsPageProps) {
  const [{ serviceId }, { supabase }, query] = await Promise.all([
    params,
    requireAdmin("/admin/servizi"),
    searchParams,
  ]);

  const [{ data: service, error: serviceError }, { data: coordinators, error: coordinatorsError }, { data: assignments, error: assignmentsError }] =
    await Promise.all([
      supabase.from("services").select("*").eq("id", serviceId).maybeSingle(),
      supabase
        .from("coordinators")
        .select("*")
        .order("last_name", { ascending: true }),
      supabase
        .from("service_coordinators")
        .select("*")
        .eq("service_id", serviceId),
    ]);

  if (serviceError) {
    throw serviceError;
  }

  if (!service) {
    notFound();
  }

  if (coordinatorsError) {
    throw coordinatorsError;
  }

  if (assignmentsError) {
    throw assignmentsError;
  }

  const coordinatorsById = new Map(
    coordinators.map((coordinator) => [coordinator.id, coordinator]),
  );

  const assignedCoordinatorIds = new Set(
    assignments.map((assignment) => assignment.coordinator_id),
  );

  const availableCoordinators = coordinators.filter(
    (coordinator) => !assignedCoordinatorIds.has(coordinator.id),
  ).toSorted((left, right) => {
    const leftLabel = `${left.last_name} ${left.first_name}`.trim();
    const rightLabel = `${right.last_name} ${right.first_name}`.trim();
    return leftLabel.localeCompare(rightLabel, "it", { sensitivity: "base" });
  });

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Admin"
        title={`Coordinatori del servizio: ${service.name}`}
        description="Gestisci le assegnazioni dei coordinatori. Se il servizio resta attivo, almeno un coordinatore attivo deve rimanere collegato."
        actions={
          <Link
            href="/admin/servizi"
            className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:border-zinc-950 hover:text-zinc-950"
          >
            Torna ai servizi
          </Link>
        }
      />

      <FlashMessage error={query.error ?? null} success={query.success ?? null} />

      <section className="rounded-[1.75rem] border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold tracking-tight text-zinc-950">
            Collega un coordinatore
          </h2>

          {availableCoordinators.length === 0 ? (
            <p className="text-sm text-zinc-600">
              Tutti i coordinatori disponibili sono gia&apos; collegati a questo
              servizio.
            </p>
          ) : (
            <form
              action={addServiceCoordinatorAction}
              className="grid gap-4 md:grid-cols-2"
            >
              <input
                type="hidden"
                name="redirect_to"
                value={`/admin/servizi/${service.id}`}
              />
              <input type="hidden" name="service_id" value={service.id} />

              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-medium text-zinc-800">
                  Coordinatore
                </span>
                <CoordinatorSearchSelect coordinators={availableCoordinators} />
              </label>

              <label className="flex items-center gap-3 rounded-2xl border border-zinc-200 px-4 py-3 text-sm text-zinc-700">
                <input type="checkbox" name="is_primary" />
                Coordinatore principale
              </label>

              <label className="flex items-center gap-3 rounded-2xl border border-zinc-200 px-4 py-3 text-sm text-zinc-700">
                <input
                  defaultChecked
                  type="checkbox"
                  name="receives_new_request_notifications"
                />
                Riceve notifiche nuove richieste
              </label>

              <div className="md:col-span-2">
                <button
                  type="submit"
                  className="rounded-full bg-zinc-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-800"
                >
                  Collega coordinatore
                </button>
              </div>
            </form>
          )}
        </div>
      </section>

      <section className="space-y-4">
        {assignments.length === 0 ? (
          <article className="rounded-[1.75rem] border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800 shadow-sm">
            Nessun coordinatore collegato. Se il servizio e&apos; attivo, aggiungine
            almeno uno prima di usarlo nel flusso pubblico.
          </article>
        ) : null}

        {assignments.map((assignment) => {
          const coordinator = coordinatorsById.get(assignment.coordinator_id);

          if (!coordinator) {
            return null;
          }

          return (
            <article
              key={assignment.coordinator_id}
              className="rounded-[1.75rem] border border-zinc-200 bg-white p-6 shadow-sm"
            >
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold tracking-tight text-zinc-950">
                    {coordinator.first_name} {coordinator.last_name}
                  </h2>
                  <p className="text-sm text-zinc-600">{coordinator.email}</p>
                </div>

                <div className="flex flex-wrap gap-2">
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

                  {assignment.is_primary ? (
                    <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-medium text-sky-700">
                      Principale
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
                <form
                  action={updateServiceCoordinatorAction}
                  className="grid gap-4 md:grid-cols-2"
                >
                  <input
                    type="hidden"
                    name="redirect_to"
                    value={`/admin/servizi/${service.id}`}
                  />
                  <input type="hidden" name="service_id" value={service.id} />
                  <input
                    type="hidden"
                    name="coordinator_id"
                    value={coordinator.id}
                  />

                  <label className="flex items-center gap-3 rounded-2xl border border-zinc-200 px-4 py-3 text-sm text-zinc-700">
                    <input
                      defaultChecked={assignment.is_primary}
                      type="checkbox"
                      name="is_primary"
                    />
                    Coordinatore principale
                  </label>

                  <label className="flex items-center gap-3 rounded-2xl border border-zinc-200 px-4 py-3 text-sm text-zinc-700">
                    <input
                      defaultChecked={
                        assignment.receives_new_request_notifications
                      }
                      type="checkbox"
                      name="receives_new_request_notifications"
                    />
                    Riceve notifiche nuove richieste
                  </label>

                  <div className="md:col-span-2">
                    <button
                      type="submit"
                      className="rounded-full bg-zinc-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-800"
                    >
                      Aggiorna assegnazione
                    </button>
                  </div>
                </form>

                <form action={removeServiceCoordinatorAction}>
                  <input
                    type="hidden"
                    name="redirect_to"
                    value={`/admin/servizi/${service.id}`}
                  />
                  <input type="hidden" name="service_id" value={service.id} />
                  <input
                    type="hidden"
                    name="coordinator_id"
                    value={coordinator.id}
                  />
                  <button
                    type="submit"
                    className="rounded-full border border-rose-200 px-5 py-3 text-sm font-medium text-rose-700 transition hover:border-rose-500 hover:text-rose-800"
                  >
                    Rimuovi dal servizio
                  </button>
                </form>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
