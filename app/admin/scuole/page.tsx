import { FlashMessage } from "@/components/admin/flash-message";
import { PageHeader } from "@/components/admin/page-header";
import { upsertSchoolAction } from "@/app/admin/actions";
import { requireAdmin } from "@/lib/auth/admin";

type SchoolsPageProps = {
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

export default async function SchoolsPage({ searchParams }: SchoolsPageProps) {
  const [{ supabase }, params] = await Promise.all([
    requireAdmin("/admin/scuole"),
    searchParams,
  ]);

  const { data: schools, error } = await supabase
    .from("schools")
    .select("*")
    .order("short_name", { ascending: true });

  if (error) {
    throw error;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Admin"
        title="Scuole"
        description="Gestisci l'anagrafica delle scuole e dei docenti di riferimento. Per l'MVP non cancelliamo record: usa il flag attivo per disattivare."
      />

      <FlashMessage error={params.error ?? null} success={params.success ?? null} />

      <section className="rounded-[1.75rem] border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold tracking-tight text-zinc-950">
            Nuova scuola
          </h2>
          <form action={upsertSchoolAction} className="grid gap-4 md:grid-cols-2">
            <input type="hidden" name="redirect_to" value="/admin/scuole" />

            <label className="space-y-2">
              <span className="text-sm font-medium text-zinc-800">Nome breve</span>
              <input
                required
                name="short_name"
                className="w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm outline-none focus:border-zinc-950"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-zinc-800">Nome formale</span>
              <input
                required
                name="full_name"
                className="w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm outline-none focus:border-zinc-950"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-zinc-800">Email scuola</span>
              <input
                type="email"
                name="school_email"
                className="w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm outline-none focus:border-zinc-950"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-zinc-800">Docente referente</span>
              <input
                name="teacher_name"
                className="w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm outline-none focus:border-zinc-950"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-zinc-800">Email docente</span>
              <input
                type="email"
                name="teacher_email"
                className="w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm outline-none focus:border-zinc-950"
              />
            </label>

            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-medium text-zinc-800">Note</span>
              <textarea
                name="notes"
                rows={3}
                className="w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm outline-none focus:border-zinc-950"
              />
            </label>

            <label className="flex items-center gap-3 rounded-2xl border border-zinc-200 px-4 py-3 text-sm text-zinc-700">
              <input
                defaultChecked
                type="checkbox"
                name="send_certificate_to_school_by_default"
              />
              Invia alla scuola per default
            </label>

            <label className="flex items-center gap-3 rounded-2xl border border-zinc-200 px-4 py-3 text-sm text-zinc-700">
              <input
                defaultChecked
                type="checkbox"
                name="send_certificate_to_teacher_by_default"
              />
              Invia al docente per default
            </label>

            <label className="flex items-center gap-3 rounded-2xl border border-zinc-200 px-4 py-3 text-sm text-zinc-700 md:col-span-2">
              <input defaultChecked type="checkbox" name="is_active" />
              Scuola attiva
            </label>

            <div className="md:col-span-2">
              <button
                type="submit"
                className="rounded-full bg-zinc-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-800"
              >
                Salva scuola
              </button>
            </div>
          </form>
        </div>
      </section>

      <section className="space-y-4">
        {schools.map((school) => (
          <article
            key={school.id}
            className="rounded-[1.75rem] border border-zinc-200 bg-white p-6 shadow-sm"
          >
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-zinc-950">
                  {school.short_name}
                </h2>
                <p className="text-sm text-zinc-600">{school.full_name}</p>
              </div>
              <span
                className={[
                  "rounded-full px-3 py-1 text-xs font-medium",
                  school.is_active
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-zinc-200 text-zinc-600",
                ].join(" ")}
              >
                {school.is_active ? "Attiva" : "Disattivata"}
              </span>
            </div>

            <form action={upsertSchoolAction} className="grid gap-4 md:grid-cols-2">
              <input type="hidden" name="redirect_to" value="/admin/scuole" />
              <input type="hidden" name="id" value={school.id} />

              <label className="space-y-2">
                <span className="text-sm font-medium text-zinc-800">Nome breve</span>
                <input
                  required
                  name="short_name"
                  defaultValue={school.short_name}
                  className="w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm outline-none focus:border-zinc-950"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-zinc-800">Nome formale</span>
                <input
                  required
                  name="full_name"
                  defaultValue={school.full_name}
                  className="w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm outline-none focus:border-zinc-950"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-zinc-800">Email scuola</span>
                <input
                  type="email"
                  name="school_email"
                  defaultValue={school.school_email ?? ""}
                  className="w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm outline-none focus:border-zinc-950"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-zinc-800">Docente referente</span>
                <input
                  name="teacher_name"
                  defaultValue={school.teacher_name ?? ""}
                  className="w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm outline-none focus:border-zinc-950"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-zinc-800">Email docente</span>
                <input
                  type="email"
                  name="teacher_email"
                  defaultValue={school.teacher_email ?? ""}
                  className="w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm outline-none focus:border-zinc-950"
                />
              </label>

              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-medium text-zinc-800">Note</span>
                <textarea
                  name="notes"
                  rows={3}
                  defaultValue={school.notes ?? ""}
                  className="w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm outline-none focus:border-zinc-950"
                />
              </label>

              <label className="flex items-center gap-3 rounded-2xl border border-zinc-200 px-4 py-3 text-sm text-zinc-700">
                <input
                  defaultChecked={school.send_certificate_to_school_by_default}
                  type="checkbox"
                  name="send_certificate_to_school_by_default"
                />
                Invia alla scuola per default
              </label>

              <label className="flex items-center gap-3 rounded-2xl border border-zinc-200 px-4 py-3 text-sm text-zinc-700">
                <input
                  defaultChecked={school.send_certificate_to_teacher_by_default}
                  type="checkbox"
                  name="send_certificate_to_teacher_by_default"
                />
                Invia al docente per default
              </label>

              <label className="flex items-center gap-3 rounded-2xl border border-zinc-200 px-4 py-3 text-sm text-zinc-700 md:col-span-2">
                <input
                  defaultChecked={school.is_active}
                  type="checkbox"
                  name="is_active"
                />
                Scuola attiva
              </label>

              <div className="md:col-span-2">
                <button
                  type="submit"
                  className="rounded-full bg-zinc-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-800"
                >
                  Aggiorna scuola
                </button>
              </div>
            </form>
          </article>
        ))}
      </section>
    </div>
  );
}
