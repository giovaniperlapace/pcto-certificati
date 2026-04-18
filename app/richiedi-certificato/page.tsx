import Link from "next/link";
import { FlashMessage } from "@/components/admin/flash-message";
import { CertificateTypeHoursFields } from "@/components/public/certificate-type-hours-fields";
import { RequestEntitySelectors } from "@/components/public/request-entity-selectors";
import { PendingSubmitButton } from "@/components/ui/pending-submit-button";
import { submitCertificateRequestAction } from "@/app/richiedi-certificato/actions";
import { createClient } from "@/lib/supabase/server";

type RequestCertificatePageProps = {
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

const fieldClassName =
  "w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-950";

export default async function RequestCertificatePage({
  searchParams,
}: RequestCertificatePageProps) {
  const supabase = await createClient();
  const [params, { data: activeYear, error: yearError }, { data: schools, error: schoolsError }, { data: services, error: servicesError }] =
    await Promise.all([
      searchParams,
      supabase
        .from("school_years")
        .select("id, label")
        .eq("is_active", true)
        .maybeSingle(),
      supabase
        .from("schools")
        .select("id, short_name, full_name")
        .eq("is_active", true)
        .order("short_name", { ascending: true }),
      supabase
        .from("services")
        .select("id, name, weekday, schedule_label, address, city")
        .eq("is_active", true)
        .order("name", { ascending: true }),
    ]);

  if (yearError) {
    throw yearError;
  }

  if (schoolsError) {
    throw schoolsError;
  }

  if (servicesError) {
    throw servicesError;
  }

  const activeSchools = schools ?? [];
  const activeServices = services ?? [];
  const isFormAvailable =
    Boolean(activeYear) && activeSchools.length > 0 && activeServices.length > 0;
  const schoolOptions = activeSchools.map((school) => ({
    id: school.id,
    label: `${school.short_name} - ${school.full_name}`,
    keywords: `${school.short_name} ${school.full_name}`,
  }));
  const serviceOptions = activeServices.map((service) => ({
    id: service.id,
    label: `${service.name} - ${service.weekday} - ${service.schedule_label}`,
    keywords: `${service.name} ${service.weekday} ${service.schedule_label} ${service.address} ${service.city}`,
  }));

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-16">
      <section className="mx-auto w-full max-w-3xl space-y-8">
        <div className="space-y-6">
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">
              Richiesta studente
            </p>
            <h1 className="text-4xl font-semibold tracking-tight text-zinc-950 sm:text-5xl">
              Richiedi un certificato PCTO o volontariato.
            </h1>
            <p className="text-base leading-7 text-zinc-600">
              Compila il modulo e la richiesta verra&apos; registrata
              per l&apos;anno scolastico attivo e presa in carico dai coordinatori
              del servizio selezionato. Se tutto è corretto riceverai il certificato in 2 o 3 giorni.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/"
              className="rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm font-medium text-zinc-700 transition hover:border-zinc-950 hover:text-zinc-950"
            >
              Torna alla home
            </Link>
          </div>
        </div>

        <section className="rounded-[2rem] border border-zinc-200 bg-white p-8 shadow-sm">
          <div className="space-y-6">
            <FlashMessage error={params.error ?? null} success={params.success ?? null} />

            {!isFormAvailable ? (
              <article className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-800">
                Il modulo pubblico non e&apos; ancora disponibile: serve almeno un anno
                scolastico attivo, una scuola attiva e un servizio attivo. In questo
                momento uno di questi prerequisiti manca ancora.
              </article>
            ) : (
              <form action={submitCertificateRequestAction} className="space-y-6">
                <div className="grid gap-5 md:grid-cols-2">
                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-zinc-800">Nome</span>
                    <input
                      required
                      type="text"
                      name="student_first_name"
                      maxLength={120}
                      className={fieldClassName}
                    />
                  </label>

                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-zinc-800">Cognome</span>
                    <input
                      required
                      type="text"
                      name="student_last_name"
                      maxLength={120}
                      className={fieldClassName}
                    />
                  </label>

                  <label className="block space-y-2 md:col-span-2">
                    <span className="text-sm font-medium text-zinc-800">
                      Email studente
                    </span>
                    <input
                      required
                      type="email"
                      name="student_email"
                      maxLength={320}
                      placeholder="nome.cognome@scuola.it"
                      className={fieldClassName}
                    />
                  </label>

                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-zinc-800">Classe</span>
                    <input
                      required
                      type="text"
                      name="class_label"
                      maxLength={80}
                      placeholder="4B"
                      className={fieldClassName}
                    />
                  </label>

                  <CertificateTypeHoursFields fieldClassName={fieldClassName} />

                  <RequestEntitySelectors
                    schoolOptions={schoolOptions}
                    serviceOptions={serviceOptions}
                  />

                  <label className="block space-y-2 md:col-span-2">
                    <span className="text-sm font-medium text-zinc-800">
                      Note per il coordinatore
                    </span>
                    <textarea
                      name="student_notes"
                      rows={5}
                      maxLength={2000}
                      placeholder="Informazioni utili per identificare meglio l'attivita' svolta."
                      className={fieldClassName}
                    />
                  </label>
                </div>

                <label className="flex items-start gap-3 rounded-2xl border border-zinc-200 p-4 text-sm leading-6 text-zinc-600">
                  <input
                    required
                    type="checkbox"
                    name="privacy_consent"
                    className="mt-1 h-4 w-4 rounded border-zinc-300 text-zinc-950 focus:ring-zinc-950"
                  />
                  <span>
                    Confermo di aver letto l&apos;informativa privacy e autorizzo il
                    trattamento dei dati strettamente necessari alla gestione della
                    richiesta di certificato.
                  </span>
                </label>

                <div className="hidden" aria-hidden="true">
                  <label>
                    Website
                    <input type="text" name="website" tabIndex={-1} autoComplete="off" />
                  </label>
                </div>

                <PendingSubmitButton
                  className="inline-flex items-center justify-center rounded-full bg-zinc-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:hover:bg-zinc-950"
                  idleLabel="Invia richiesta"
                  pendingLabel="Invio richiesta in corso..."
                />
              </form>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
