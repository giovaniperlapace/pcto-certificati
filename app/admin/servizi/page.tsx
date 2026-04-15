import Link from "next/link";
import { FlashMessage } from "@/components/admin/flash-message";
import { PageHeader } from "@/components/admin/page-header";
import { upsertServiceAction } from "@/app/admin/actions";
import { requireAdmin } from "@/lib/auth/admin";

type ServicesPageProps = {
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

const weekdays = [
  "Lunedi",
  "Martedi",
  "Mercoledi",
  "Giovedi",
  "Venerdi",
  "Sabato",
  "Domenica",
];

export default async function ServicesPage({ searchParams }: ServicesPageProps) {
  const [{ supabase }, params] = await Promise.all([
    requireAdmin("/admin/servizi"),
    searchParams,
  ]);

  const [{ data: services, error: servicesError }, { data: assignments, error: assignmentsError }] =
    await Promise.all([
      supabase.from("services").select("*").order("name", { ascending: true }),
      supabase.from("service_coordinators").select("service_id, coordinator_id"),
    ]);

  if (servicesError) {
    throw servicesError;
  }

  if (assignmentsError) {
    throw assignmentsError;
  }

  const assignmentCountByService = assignments.reduce<Record<string, number>>(
    (accumulator, assignment) => {
      accumulator[assignment.service_id] =
        (accumulator[assignment.service_id] ?? 0) + 1;

      return accumulator;
    },
    {},
  );

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Admin"
        title="Servizi"
        description="Crea i servizi disponibili e poi collega i coordinatori dalla pagina dedicata di ogni servizio."
      />

      <FlashMessage error={params.error ?? null} success={params.success ?? null} />

      <section className="rounded-[1.75rem] border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold tracking-tight text-zinc-950">
            Nuovo servizio
          </h2>
          <form action={upsertServiceAction} className="grid gap-4 md:grid-cols-2">
            <input type="hidden" name="redirect_to" value="/admin/servizi" />

            <label className="space-y-2">
              <span className="text-sm font-medium text-zinc-800">Nome servizio</span>
              <input
                required
                name="name"
                className="w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm outline-none focus:border-zinc-950"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-zinc-800">Giorno</span>
              <select
                required
                name="weekday"
                className="w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm outline-none focus:border-zinc-950"
                defaultValue="Lunedi"
              >
                {weekdays.map((day) => (
                  <option key={day} value={day}>
                    {day}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-zinc-800">Ora inizio</span>
              <input
                type="time"
                name="start_time"
                className="w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm outline-none focus:border-zinc-950"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-zinc-800">Ora fine</span>
              <input
                type="time"
                name="end_time"
                className="w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm outline-none focus:border-zinc-950"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-zinc-800">Etichetta orario</span>
              <input
                required
                name="schedule_label"
                placeholder="Mercoledi 16:30 - 18:30"
                className="w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm outline-none focus:border-zinc-950"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-zinc-800">Citta&apos;</span>
              <input
                required
                name="city"
                defaultValue="Roma"
                className="w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm outline-none focus:border-zinc-950"
              />
            </label>

            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-medium text-zinc-800">Indirizzo</span>
              <input
                required
                name="address"
                className="w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm outline-none focus:border-zinc-950"
              />
            </label>

            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-medium text-zinc-800">
                Etichetta certificato
              </span>
              <input
                name="certificate_label"
                className="w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm outline-none focus:border-zinc-950"
              />
            </label>

            <label className="flex items-center gap-3 rounded-2xl border border-zinc-200 px-4 py-3 text-sm text-zinc-700 md:col-span-2">
              <input type="checkbox" name="is_active" />
              Servizio attivo
            </label>

            <p className="text-sm text-zinc-500 md:col-span-2">
              Crea prima il servizio, poi collega almeno un coordinatore dalla
              pagina dedicata e solo dopo attivalo.
            </p>

            <div className="md:col-span-2">
              <button
                type="submit"
                className="rounded-full bg-zinc-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-800"
              >
                Salva servizio
              </button>
            </div>
          </form>
        </div>
      </section>

      <section className="space-y-4">
        {services.map((service) => (
          <article
            key={service.id}
            className="rounded-[1.75rem] border border-zinc-200 bg-white p-6 shadow-sm"
          >
            <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold tracking-tight text-zinc-950">
                  {service.name}
                </h2>
                <p className="text-sm text-zinc-600">{service.schedule_label}</p>
                <p className="text-sm text-zinc-500">
                  {assignmentCountByService[service.id] ?? 0} coordinatori collegati
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span
                  className={[
                    "rounded-full px-3 py-1 text-xs font-medium",
                    service.is_active
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-zinc-200 text-zinc-600",
                  ].join(" ")}
                >
                  {service.is_active ? "Attivo" : "Disattivato"}
                </span>
                <Link
                  href={`/admin/servizi/${service.id}`}
                  className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:border-zinc-950 hover:text-zinc-950"
                >
                  Gestisci coordinatori
                </Link>
              </div>
            </div>

            <form action={upsertServiceAction} className="grid gap-4 md:grid-cols-2">
              <input type="hidden" name="redirect_to" value="/admin/servizi" />
              <input type="hidden" name="id" value={service.id} />

              <label className="space-y-2">
                <span className="text-sm font-medium text-zinc-800">Nome servizio</span>
                <input
                  required
                  name="name"
                  defaultValue={service.name}
                  className="w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm outline-none focus:border-zinc-950"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-zinc-800">Giorno</span>
                <select
                  required
                  name="weekday"
                  defaultValue={service.weekday}
                  className="w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm outline-none focus:border-zinc-950"
                >
                  {weekdays.map((day) => (
                    <option key={day} value={day}>
                      {day}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-zinc-800">Ora inizio</span>
                <input
                  type="time"
                  name="start_time"
                  defaultValue={service.start_time ?? ""}
                  className="w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm outline-none focus:border-zinc-950"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-zinc-800">Ora fine</span>
                <input
                  type="time"
                  name="end_time"
                  defaultValue={service.end_time ?? ""}
                  className="w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm outline-none focus:border-zinc-950"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-zinc-800">Etichetta orario</span>
                <input
                  required
                  name="schedule_label"
                  defaultValue={service.schedule_label}
                  className="w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm outline-none focus:border-zinc-950"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-zinc-800">Citta&apos;</span>
                <input
                  required
                  name="city"
                  defaultValue={service.city}
                  className="w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm outline-none focus:border-zinc-950"
                />
              </label>

              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-medium text-zinc-800">Indirizzo</span>
                <input
                  required
                  name="address"
                  defaultValue={service.address}
                  className="w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm outline-none focus:border-zinc-950"
                />
              </label>

              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-medium text-zinc-800">
                  Etichetta certificato
                </span>
                <input
                  name="certificate_label"
                  defaultValue={service.certificate_label ?? ""}
                  className="w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm outline-none focus:border-zinc-950"
                />
              </label>

              <label className="flex items-center gap-3 rounded-2xl border border-zinc-200 px-4 py-3 text-sm text-zinc-700 md:col-span-2">
                <input
                  defaultChecked={service.is_active}
                  type="checkbox"
                  name="is_active"
                />
                Servizio attivo
              </label>

              <div className="md:col-span-2">
                <button
                  type="submit"
                  className="rounded-full bg-zinc-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-800"
                >
                  Aggiorna servizio
                </button>
              </div>
            </form>
          </article>
        ))}
      </section>
    </div>
  );
}
