import Link from "next/link";
import { FlashMessage } from "@/components/admin/flash-message";
import { CertificateRequestFlow } from "@/components/public/certificate-request-flow";
import { createClient } from "@/lib/supabase/server";

type RequestCertificatePageProps = {
  searchParams: Promise<{
    error?: string;
    flow?: string;
    student_first_name?: string;
    student_last_name?: string;
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
              <CertificateRequestFlow
                fieldClassName={fieldClassName}
                initialFirstName={params.student_first_name ?? ""}
                initialLastName={params.student_last_name ?? ""}
                initialStep={
                  params.flow === "pcto-manual" ? "pcto-manual" : "choice"
                }
                schoolOptions={schoolOptions}
                serviceOptions={serviceOptions}
              />
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
