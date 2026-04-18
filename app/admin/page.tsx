import Link from "next/link";
import { FlashMessage } from "@/components/admin/flash-message";
import { PageHeader } from "@/components/admin/page-header";
import { PendingSubmitButton } from "@/components/ui/pending-submit-button";
import {
  saveCertificateSignatureSettingsAction,
  saveCertificateTemplatesAction,
} from "@/app/admin/actions";
import { requireAdmin } from "@/lib/auth/admin";
import { loadCertificateSignatureSettings } from "@/lib/certificates/signature";
import {
  CERTIFICATE_TEMPLATE_PLACEHOLDERS,
  loadCertificateTemplates,
} from "@/lib/certificates/templates";

async function getCount(
  supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"],
  table: "schools" | "services" | "coordinators" | "certificate_requests",
  filter?: { column: string; value: boolean },
) {
  let query = supabase
    .from(table)
    .select("*", { count: "exact", head: true });

  if (filter) {
    query = query.eq(filter.column, filter.value);
  }

  const { count, error } = await query;

  if (error) {
    throw error;
  }

  return count ?? 0;
}

type AdminDashboardPageProps = {
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

export default async function AdminDashboardPage({
  searchParams,
}: AdminDashboardPageProps) {
  const [{ supabase }, params] = await Promise.all([
    requireAdmin("/admin"),
    searchParams,
  ]);
  const [
    schools,
    activeSchools,
    services,
    activeServices,
    coordinators,
    activeCoordinators,
    submittedRequests,
    templates,
    signatureSettings,
  ] = await Promise.all([
    getCount(supabase, "schools"),
    getCount(supabase, "schools", { column: "is_active", value: true }),
    getCount(supabase, "services"),
    getCount(supabase, "services", { column: "is_active", value: true }),
    getCount(supabase, "coordinators"),
    getCount(supabase, "coordinators", { column: "is_active", value: true }),
    getCount(supabase, "certificate_requests"),
    loadCertificateTemplates(),
    loadCertificateSignatureSettings(),
  ]);

  const cards = [
    {
      title: "Scuole",
      value: schools,
      meta: `${activeSchools} attive`,
      href: "/admin/scuole",
    },
    {
      title: "Servizi",
      value: services,
      meta: `${activeServices} attivi`,
      href: "/admin/servizi",
    },
    {
      title: "Coordinatori",
      value: coordinators,
      meta: `${activeCoordinators} attivi`,
      href: "/admin/coordinatori",
    },
    {
      title: "Richieste",
      value: submittedRequests,
      meta: "Totale record richieste",
      href: "/admin",
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Admin"
        title="Anagrafiche amministrative"
        description="Questa area serve a mantenere scuole, servizi, coordinatori, assegnazioni e ora anche i testi base dei certificati con placeholder dinamici."
      />

      <FlashMessage error={params.error ?? null} success={params.success ?? null} />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Link
            key={card.title}
            href={card.href}
            className="rounded-[1.75rem] border border-zinc-200 bg-white p-6 shadow-sm transition hover:border-zinc-950"
          >
            <div className="space-y-2">
              <p className="text-sm font-medium text-zinc-600">{card.title}</p>
              <p className="text-4xl font-semibold tracking-tight text-zinc-950">
                {card.value}
              </p>
              <p className="text-sm text-zinc-500">{card.meta}</p>
            </div>
          </Link>
        ))}
      </section>

      <section className="rounded-[1.75rem] border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="space-y-3">
          <h2 className="text-xl font-semibold tracking-tight text-zinc-950">
            Prossimi passi amministrativi
          </h2>
          <ul className="space-y-2 text-sm leading-6 text-zinc-600">
            <li>
              1. Caricare le scuole con nome formale, email scuola e docente.
            </li>
            <li>2. Creare i servizi con giorno, orario e indirizzo.</li>
            <li>3. Creare i coordinatori con email valida per il Magic Link.</li>
            <li>
              4. Collegare almeno un coordinatore attivo a ogni servizio attivo.
            </li>
          </ul>
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="space-y-3 border-b border-zinc-200 pb-5">
          <h2 className="text-xl font-semibold tracking-tight text-zinc-950">
            Template certificati
          </h2>
          <p className="max-w-3xl text-sm leading-6 text-zinc-600">
            Qui puoi modificare il testo base dei certificati PCTO e volontariato.
            I placeholder vengono risolti automaticamente quando il PDF viene
            generato. Gli override del coordinatore per la singola richiesta
            restano comunque possibili.
          </p>
        </div>

        <form action={saveCertificateTemplatesAction} className="mt-6 space-y-8">
          <input type="hidden" name="redirect_to" value="/admin" />

          <div className="grid gap-6 xl:grid-cols-2">
            {[
              {
                bodyName: "pcto_body_template",
                bodyValue: templates.pcto.bodyTemplate,
                headingName: "pcto_heading_template",
                headingValue: templates.pcto.headingTemplate,
                title: "PCTO",
              },
              {
                bodyName: "volontariato_body_template",
                bodyValue: templates.volontariato.bodyTemplate,
                headingName: "volontariato_heading_template",
                headingValue: templates.volontariato.headingTemplate,
                title: "Volontariato",
              },
            ].map((template) => (
              <article
                key={template.title}
                className="space-y-4 rounded-[1.5rem] border border-zinc-200 bg-zinc-50 p-5"
              >
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold text-zinc-950">
                    {template.title}
                  </h3>
                  <p className="text-sm leading-6 text-zinc-600">
                    Il testo salvato qui diventa il default per tutte le nuove
                    generazioni PDF di questo tipo.
                  </p>
                </div>

                <label className="block space-y-2">
                  <span className="text-sm font-medium text-zinc-800">
                    Intestazione
                  </span>
                  <textarea
                    name={template.headingName}
                    defaultValue={template.headingValue}
                    rows={3}
                    className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-950"
                  />
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-medium text-zinc-800">Testo</span>
                  <textarea
                    name={template.bodyName}
                    defaultValue={template.bodyValue}
                    rows={12}
                    className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm leading-6 text-zinc-950 outline-none transition focus:border-zinc-950"
                  />
                </label>
              </article>
            ))}
          </div>

          <div className="rounded-[1.5rem] border border-dashed border-zinc-300 bg-zinc-50/70 p-5">
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-600">
              Placeholder disponibili
            </h3>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {CERTIFICATE_TEMPLATE_PLACEHOLDERS.map((placeholder) => (
                <article
                  key={placeholder.token}
                  className="rounded-2xl border border-zinc-200 bg-white p-4"
                >
                  <p className="font-mono text-sm text-zinc-950">
                    {placeholder.token}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-zinc-600">
                    {placeholder.description}
                  </p>
                </article>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-zinc-500">
              Se inserisci un placeholder non riconosciuto, il sistema blocca il
              salvataggio per evitare errori nei PDF.
            </p>
            <PendingSubmitButton
              className="rounded-full bg-zinc-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:hover:bg-zinc-950"
              idleLabel="Salva template certificati"
              pendingLabel="Salvataggio template in corso..."
            />
          </div>
        </form>
      </section>

      <section className="rounded-[1.75rem] border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="space-y-3 border-b border-zinc-200 pb-5">
          <h2 className="text-xl font-semibold tracking-tight text-zinc-950">
            Firma certificato
          </h2>
          <p className="max-w-3xl text-sm leading-6 text-zinc-600">
            Qui puoi modificare i testi dell&apos;area firma e il nome del file
            immagine usato nel PDF. L&apos;immagine deve stare in
            `public/certificate-assets/`.
          </p>
        </div>

        <form action={saveCertificateSignatureSettingsAction} className="mt-6 space-y-6">
          <input type="hidden" name="redirect_to" value="/admin" />

          <div className="grid gap-5 xl:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-zinc-800">
                Citta&apos; di rilascio
              </span>
              <input
                name="issued_in_city"
                defaultValue={signatureSettings.issuedInCity}
                className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-950"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-zinc-800">
                Nome file immagine firma
              </span>
              <input
                name="signature_image_file_name"
                defaultValue={signatureSettings.signatureImageFileName}
                className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-950"
              />
              <p className="text-xs leading-5 text-zinc-500">
                Esempio: `signature.png`. Se il file non esiste, il sistema usa
                il fallback standard.
              </p>
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-zinc-800">
                Nome firmatario
              </span>
              <input
                name="signer_name"
                defaultValue={signatureSettings.signerName}
                className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-950"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-zinc-800">
                Ruolo firmatario
              </span>
              <input
                name="signer_role"
                defaultValue={signatureSettings.signerRole}
                className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-950"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-zinc-800">
                Telefono firmatario (opzionale)
              </span>
              <input
                name="signer_phone"
                defaultValue={signatureSettings.signerPhone ?? ""}
                className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-950"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-zinc-800">
                Email firmatario (opzionale)
              </span>
              <input
                name="signer_email"
                defaultValue={signatureSettings.signerEmail ?? ""}
                className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-950"
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-zinc-500">
              Le modifiche si applicano ai PDF generati da questo momento in poi.
            </p>
            <PendingSubmitButton
              className="rounded-full bg-zinc-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:hover:bg-zinc-950"
              idleLabel="Salva impostazioni firma"
              pendingLabel="Salvataggio firma in corso..."
            />
          </div>
        </form>
      </section>
    </div>
  );
}
