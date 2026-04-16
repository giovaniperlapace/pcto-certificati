import Link from "next/link";
import { FlashMessage } from "@/components/admin/flash-message";
import { PageHeader } from "@/components/admin/page-header";
import { RequestStatusBadge } from "@/components/coordinator/request-status-badge";
import {
  buildCoordinatorRequestPath,
  formatDateTime,
  getRequestStatusMeta,
  REQUEST_STATUS_ORDER,
  type RequestStatus,
} from "@/lib/coordinator/requests";
import { requireCoordinator } from "@/lib/auth/admin";

type CoordinatorDashboardPageProps = {
  searchParams: Promise<{
    error?: string;
    service?: string;
    status?: string;
    success?: string;
  }>;
};

type AssignedService = {
  id: string;
  name: string;
  weekday: string;
  schedule_label: string;
  address: string;
  city: string;
  is_active: boolean;
  is_primary: boolean;
  receives_new_request_notifications: boolean;
};

const FILTERABLE_STATUSES = ["all", ...REQUEST_STATUS_ORDER] as const;

type StatusFilter = (typeof FILTERABLE_STATUSES)[number];

function isStatusFilter(value: string | undefined): value is StatusFilter {
  return Boolean(value && FILTERABLE_STATUSES.includes(value as StatusFilter));
}

async function getRequestCount(
  supabase: Awaited<ReturnType<typeof requireCoordinator>>["supabase"],
  options: {
    serviceId?: string;
    status?: RequestStatus;
  } = {},
) {
  let query = supabase
    .from("certificate_requests")
    .select("*", { count: "exact", head: true });

  if (options.serviceId) {
    query = query.eq("service_id", options.serviceId);
  }

  if (options.status) {
    query = query.eq("status", options.status);
  }

  const { count, error } = await query;

  if (error) {
    throw error;
  }

  return count ?? 0;
}

export default async function CoordinatorDashboardPage({
  searchParams,
}: CoordinatorDashboardPageProps) {
  const [{ coordinator, supabase }, params] = await Promise.all([
    requireCoordinator("/coordinatore"),
    searchParams,
  ]);

  if (!coordinator) {
    throw new Error("Coordinatore non disponibile.");
  }

  const { data: assignments, error: assignmentsError } = await supabase
    .from("service_coordinators")
    .select(
      "is_primary, receives_new_request_notifications, services(id, name, weekday, schedule_label, address, city, is_active)",
    )
    .eq("coordinator_id", coordinator.id);

  if (assignmentsError) {
    throw assignmentsError;
  }

  const assignedServices = (assignments ?? [])
    .map((assignment) => {
      const service = Array.isArray(assignment.services)
        ? assignment.services[0]
        : assignment.services;

      if (!service) {
        return null;
      }

      return {
        id: service.id,
        name: service.name,
        weekday: service.weekday,
        schedule_label: service.schedule_label,
        address: service.address,
        city: service.city,
        is_active: service.is_active,
        is_primary: assignment.is_primary,
        receives_new_request_notifications:
          assignment.receives_new_request_notifications,
      } satisfies AssignedService;
    })
    .filter((service): service is AssignedService => service !== null)
    .sort((left, right) => left.name.localeCompare(right.name, "it"));

  const requestedServiceId = params.service;
  const selectedServiceId = assignedServices.some(
    (service) => service.id === requestedServiceId,
  )
    ? requestedServiceId
    : undefined;
  const selectedStatus: StatusFilter = isStatusFilter(params.status)
    ? params.status
    : "submitted";

  const statusCountsEntries = await Promise.all(
    REQUEST_STATUS_ORDER.map(async (status) => [
      status,
      await getRequestCount(supabase, {
        serviceId: selectedServiceId,
        status,
      }),
    ] as const),
  );
  const statusCounts = Object.fromEntries(statusCountsEntries) as Record<
    RequestStatus,
    number
  >;
  const totalRequestCount = await getRequestCount(supabase, {
    serviceId: selectedServiceId,
  });

  let requestsQuery = supabase
    .from("certificate_requests")
    .select(
      "id, status, submitted_at, updated_at, certificate_type, student_first_name, student_last_name, student_email, class_label, hours_requested, hours_approved, school_name_snapshot, service_name_snapshot, reviewed_at",
    )
    .order("submitted_at", { ascending: false })
    .limit(50);

  if (selectedServiceId) {
    requestsQuery = requestsQuery.eq("service_id", selectedServiceId);
  }

  if (selectedStatus !== "all") {
    requestsQuery = requestsQuery.eq("status", selectedStatus);
  }

  const { data: requests, error: requestsError } = await requestsQuery;

  if (requestsError) {
    throw requestsError;
  }

  const totalSubmitted = statusCounts.submitted;
  const totalApproved = statusCounts.approved;
  const totalRejected = statusCounts.rejected;
  const totalAttention = statusCounts.delivery_failed;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Fase 5"
        title={`${coordinator.first_name} ${coordinator.last_name}`}
        description="Questa area raccoglie solo le richieste dei servizi assegnati al coordinatore. Da qui puoi filtrare per stato, aprire il dettaglio e prendere una decisione senza uscire dal perimetro autorizzato."
      />

      <FlashMessage error={params.error ?? null} success={params.success ?? null} />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Da revisionare",
            value: totalSubmitted,
            meta: "Richieste ancora aperte",
          },
          {
            label: "Approvate",
            value: totalApproved,
            meta: "Pronte per il ciclo finale",
          },
          {
            label: "Rifiutate",
            value: totalRejected,
            meta: "Chiuse con motivazione",
          },
          {
            label: "Da attenzionare",
            value: totalAttention,
            meta: "Invio o PDF da verificare",
          },
        ].map((card) => (
          <article
            key={card.label}
            className="rounded-[1.75rem] border border-zinc-200 bg-white p-6 shadow-sm"
          >
            <p className="text-sm font-medium text-zinc-600">{card.label}</p>
            <p className="mt-2 text-4xl font-semibold tracking-tight text-zinc-950">
              {card.value}
            </p>
            <p className="mt-1 text-sm text-zinc-500">{card.meta}</p>
          </article>
        ))}
      </section>

      <section className="rounded-[1.75rem] border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 border-b border-zinc-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold tracking-tight text-zinc-950">
              Richieste assegnate
            </h2>
            <p className="max-w-3xl text-sm leading-6 text-zinc-600">
              Il filtro per stato crea viste operative immediate. La lista qui sotto
              rispetta sempre i soli servizi collegati a questo coordinatore.
            </p>
          </div>

          <form className="flex flex-wrap items-center gap-3" action="/coordinatore">
            <input type="hidden" name="status" value={selectedStatus} />
            <label className="flex items-center gap-2 text-sm text-zinc-600">
              <span>Servizio</span>
              <select
                name="service"
                defaultValue={selectedServiceId ?? ""}
                className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-700 outline-none transition focus:border-zinc-950"
              >
                <option value="">Tutti i servizi</option>
                {assignedServices.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:border-zinc-950 hover:text-zinc-950"
            >
              Applica filtro
            </button>
            {selectedServiceId ? (
              <Link
                href={`/coordinatore?status=${selectedStatus}`}
                className="text-sm font-medium text-zinc-500 transition hover:text-zinc-950"
              >
                Azzera servizio
              </Link>
            ) : null}
          </form>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            href={`/coordinatore?status=all${selectedServiceId ? `&service=${selectedServiceId}` : ""}`}
            className={[
              "rounded-full border px-3 py-2 text-sm font-medium transition",
              selectedStatus === "all"
                ? "border-zinc-950 bg-zinc-950 text-white"
                : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-950 hover:text-zinc-950",
            ].join(" ")}
          >
            Tutte ({totalRequestCount})
          </Link>
          {REQUEST_STATUS_ORDER.map((status) => {
            const meta = getRequestStatusMeta(status);

            return (
              <Link
                key={status}
                href={`/coordinatore?status=${status}${selectedServiceId ? `&service=${selectedServiceId}` : ""}`}
                className={[
                  "rounded-full border px-3 py-2 text-sm font-medium transition",
                  selectedStatus === status
                    ? "border-zinc-950 bg-zinc-950 text-white"
                    : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-950 hover:text-zinc-950",
                ].join(" ")}
                title={meta.description}
              >
                {meta.label} ({statusCounts[status]})
              </Link>
            );
          })}
        </div>

        <div className="mt-6 grid gap-4">
          {requests && requests.length > 0 ? (
            requests.map((request) => (
              <article
                key={request.id}
                className="rounded-2xl border border-zinc-200 p-5 transition hover:border-zinc-950"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <RequestStatusBadge status={request.status} />
                      <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-medium text-zinc-700">
                        {request.certificate_type === "pcto"
                          ? "PCTO"
                          : "Volontariato"}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-zinc-950">
                        {request.student_first_name} {request.student_last_name}
                      </h3>
                      <p className="text-sm text-zinc-600">
                        {request.student_email} · Classe {request.class_label}
                      </p>
                    </div>

                    <div className="space-y-1 text-sm text-zinc-600">
                      <p>
                        <span className="font-medium text-zinc-800">Servizio:</span>{" "}
                        {request.service_name_snapshot}
                      </p>
                      <p>
                        <span className="font-medium text-zinc-800">Scuola:</span>{" "}
                        {request.school_name_snapshot}
                      </p>
                      <p>
                        <span className="font-medium text-zinc-800">Ore:</span>{" "}
                        {request.hours_approved ?? request.hours_requested ?? "-"}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 text-sm text-zinc-500 lg:text-right">
                    <div>
                      <p>Inviata il {formatDateTime(request.submitted_at)}</p>
                      <p>Aggiornata il {formatDateTime(request.updated_at)}</p>
                    </div>
                    <Link
                      href={buildCoordinatorRequestPath(request.id)}
                      className="inline-flex rounded-full border border-zinc-200 bg-white px-4 py-2 font-medium text-zinc-700 transition hover:border-zinc-950 hover:text-zinc-950"
                    >
                      Apri dettaglio
                    </Link>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <article className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 text-sm leading-6 text-zinc-600">
              Nessuna richiesta trovata per i filtri correnti. Puoi cambiare stato
              o servizio per esplorare le altre viste del dashboard.
            </article>
          )}
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 pb-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-zinc-950">
              Servizi assegnati
            </h2>
            <p className="mt-1 text-sm text-zinc-600">
              Promemoria operativo dei servizi su cui questo coordinatore ha
              visibilita&apos;.
            </p>
          </div>

          <div className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-700">
            <span className="font-semibold text-zinc-950">
              {assignedServices.length}
            </span>{" "}
            servizi collegati
          </div>
        </div>

        <div className="mt-5 grid gap-4">
          {assignedServices.length === 0 ? (
            <article className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
              Nessun servizio assegnato al momento. Quando un admin
              colleghera&apos; questo coordinatore a uno o piu&apos; servizi,
              compariranno qui.
            </article>
          ) : (
            assignedServices.map((service) => (
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
                    {service.is_primary ? (
                      <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700">
                        Principale
                      </span>
                    ) : null}
                    {service.receives_new_request_notifications ? (
                      <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-medium text-zinc-700">
                        Riceve notifiche
                      </span>
                    ) : null}
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
