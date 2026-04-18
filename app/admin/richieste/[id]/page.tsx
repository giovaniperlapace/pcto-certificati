import Link from "next/link";
import { notFound } from "next/navigation";
import { FlashMessage } from "@/components/admin/flash-message";
import { PageHeader } from "@/components/admin/page-header";
import { RequestStatusBadge } from "@/components/coordinator/request-status-badge";
import { requireAdmin } from "@/lib/auth/admin";
import {
  formatActorType,
  formatDateTime,
  formatRequestEventType,
  getRequestStatusMeta,
} from "@/lib/coordinator/requests";
import type { Enums } from "@/lib/supabase/database.types";

type AdminRequestDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

const deliveryStatusLabels: Record<Enums<"email_delivery_status">, string> = {
  failed: "Fallita",
  pending: "In attesa",
  sent: "Inviata",
};

const recipientTypeLabels: Record<Enums<"email_recipient_type">, string> = {
  admin: "Admin",
  coordinator: "Coordinatore",
  school: "Scuola",
  student: "Studente",
  teacher: "Docente",
};

function formatCertificateType(value: "pcto" | "volontariato") {
  return value === "pcto" ? "PCTO" : "Volontariato";
}

function formatDeliveryStatus(value: Enums<"email_delivery_status">) {
  return deliveryStatusLabels[value];
}

function formatRecipientType(value: Enums<"email_recipient_type">) {
  return recipientTypeLabels[value];
}

function formatBoolean(value: boolean) {
  return value ? "Si" : "No";
}

export default async function AdminRequestDetailPage({
  params,
  searchParams,
}: AdminRequestDetailPageProps) {
  const [{ id }, query, { supabase }] = await Promise.all([
    params,
    searchParams,
    requireAdmin("/admin/richieste"),
  ]);

  const { data: request, error: requestError } = await supabase
    .from("certificate_requests")
    .select(
      "id, status, submitted_at, updated_at, reviewed_at, approved_at, rejected_at, reviewed_by_coordinator_id, rejection_reason, decision_notes, certificate_type, certificate_heading_text, certificate_body_text, student_first_name, student_last_name, student_email, class_label, hours_requested, hours_approved, student_notes, school_id, school_year_id, school_name_snapshot, teacher_name_snapshot, teacher_email_snapshot, service_name_snapshot, service_schedule_snapshot, service_address_snapshot, send_to_school, send_to_teacher, pdf_generated_at, pdf_storage_path, student_emailed_at, school_emailed_at, teacher_emailed_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (requestError) {
    throw requestError;
  }

  if (!request) {
    notFound();
  }

  const [
    { data: school, error: schoolError },
    { data: schoolYear, error: schoolYearError },
    { data: reviewer, error: reviewerError },
    { data: events, error: eventsError },
    { data: deliveries, error: deliveriesError },
  ] = await Promise.all([
    request.school_id
      ? supabase
          .from("schools")
          .select("school_email")
          .eq("id", request.school_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase
      .from("school_years")
      .select("label")
      .eq("id", request.school_year_id)
      .maybeSingle(),
    request.reviewed_by_coordinator_id
      ? supabase
          .from("coordinators")
          .select("first_name, last_name, email")
          .eq("id", request.reviewed_by_coordinator_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase
      .from("request_events")
      .select("id, actor_type, created_at, event_type")
      .eq("request_id", request.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("email_deliveries")
      .select(
        "id, recipient_type, recipient_email, status, template_key, attempt_count, last_attempt_at, sent_at, error_message, created_at",
      )
      .eq("request_id", request.id)
      .order("created_at", { ascending: false }),
  ]);

  if (schoolError) {
    throw schoolError;
  }

  if (schoolYearError) {
    throw schoolYearError;
  }

  if (reviewerError) {
    throw reviewerError;
  }

  if (eventsError) {
    throw eventsError;
  }

  if (deliveriesError) {
    throw deliveriesError;
  }

  const statusMeta = getRequestStatusMeta(request.status);
  const reviewerLabel = reviewer
    ? `${reviewer.first_name} ${reviewer.last_name}`
    : "-";

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Richiesta admin"
        title={`${request.student_first_name} ${request.student_last_name}`}
        description="Vista completa della richiesta ricevuta, inclusi dati studente, snapshot per certificato, stato revisione e storico operativo."
        actions={
          <Link
            href="/admin/richieste"
            className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:border-zinc-950 hover:text-zinc-950"
          >
            Torna alle richieste
          </Link>
        }
      />

      <FlashMessage error={query.error ?? null} success={query.success ?? null} />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-[1.75rem] border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-zinc-600">Stato</p>
          <div className="mt-3">
            <RequestStatusBadge status={request.status} />
          </div>
          <p className="mt-3 text-sm text-zinc-500">{statusMeta.description}</p>
        </article>

        <article className="rounded-[1.75rem] border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-zinc-600">Richiesta inviata</p>
          <p className="mt-2 text-lg font-semibold text-zinc-950">
            {formatDateTime(request.submitted_at)}
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            Aggiornata il {formatDateTime(request.updated_at)}
          </p>
        </article>

        <article className="rounded-[1.75rem] border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-zinc-600">Certificato</p>
          <p className="mt-2 text-lg font-semibold text-zinc-950">
            {formatCertificateType(request.certificate_type)}
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            Anno {schoolYear?.label ?? "non disponibile"}
          </p>
        </article>

        <article className="rounded-[1.75rem] border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-zinc-600">Consegna</p>
          <div className="mt-2 space-y-1 text-sm text-zinc-600">
            <p>PDF: {request.pdf_generated_at ? "Generato" : "Non generato"}</p>
            <p>Studente: {request.student_emailed_at ? "Inviato" : "Non inviato"}</p>
            <p>Scuola: {request.school_emailed_at ? "Inviato" : "Non inviato"}</p>
            <p>Docente: {request.teacher_emailed_at ? "Inviato" : "Non inviato"}</p>
          </div>
        </article>
      </section>

      <section className="grid gap-8 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <div className="space-y-8">
          <section className="rounded-[1.75rem] border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="border-b border-zinc-200 pb-4">
              <h2 className="text-xl font-semibold tracking-tight text-zinc-950">
                Dati richiesta
              </h2>
              <p className="mt-1 text-sm leading-6 text-zinc-600">
                Questi sono i dati salvati dal form pubblico e gli eventuali
                aggiornamenti fatti in revisione.
              </p>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {[
                ["Nome", request.student_first_name],
                ["Cognome", request.student_last_name],
                ["Email studente", request.student_email],
                ["Classe", request.class_label],
                ["Tipo certificato", formatCertificateType(request.certificate_type)],
                ["Ore richieste", request.hours_requested?.toString() ?? "-"],
                ["Ore approvate", request.hours_approved?.toString() ?? "-"],
                ["Note studente", request.student_notes ?? "-"],
              ].map(([label, value]) => (
                <article
                  key={label}
                  className="rounded-2xl border border-zinc-200 p-4"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                    {label}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-zinc-700">{value}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-[1.75rem] border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="border-b border-zinc-200 pb-4">
              <h2 className="text-xl font-semibold tracking-tight text-zinc-950">
                Snapshot certificato
              </h2>
              <p className="mt-1 text-sm leading-6 text-zinc-600">
                Nome scuola e servizio vengono congelati sulla richiesta per
                mantenere coerente il certificato anche se le anagrafiche cambiano.
              </p>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {[
                ["Scuola", request.school_name_snapshot],
                ["Email scuola", school?.school_email ?? "-"],
                ["Docente", request.teacher_name_snapshot ?? "-"],
                ["Email docente", request.teacher_email_snapshot ?? "-"],
                ["Servizio", request.service_name_snapshot],
                ["Orario servizio", request.service_schedule_snapshot],
                ["Indirizzo servizio", request.service_address_snapshot],
                ["Invio copia scuola", formatBoolean(request.send_to_school)],
                ["Invio copia docente", formatBoolean(request.send_to_teacher)],
              ].map(([label, value]) => (
                <article
                  key={label}
                  className="rounded-2xl border border-zinc-200 p-4"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                    {label}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-zinc-700">{value}</p>
                </article>
              ))}
            </div>
          </section>

          {(request.certificate_heading_text || request.certificate_body_text) ? (
            <section className="rounded-[1.75rem] border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="border-b border-zinc-200 pb-4">
                <h2 className="text-xl font-semibold tracking-tight text-zinc-950">
                  Testo certificato personalizzato
                </h2>
                <p className="mt-1 text-sm leading-6 text-zinc-600">
                  Se presenti, questi testi sostituiscono il template globale solo
                  per questa richiesta.
                </p>
              </div>

              <div className="mt-6 grid gap-4">
                {request.certificate_heading_text ? (
                  <article className="rounded-2xl border border-zinc-200 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                      Intestazione
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-700">
                      {request.certificate_heading_text}
                    </p>
                  </article>
                ) : null}

                {request.certificate_body_text ? (
                  <article className="rounded-2xl border border-zinc-200 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                      Testo
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-700">
                      {request.certificate_body_text}
                    </p>
                  </article>
                ) : null}
              </div>
            </section>
          ) : null}
        </div>

        <div className="space-y-8">
          <section className="rounded-[1.75rem] border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold tracking-tight text-zinc-950">
              Revisione
            </h2>
            <div className="mt-5 space-y-3 text-sm leading-6 text-zinc-600">
              <p>Revisione avviata: {formatDateTime(request.reviewed_at)}</p>
              <p>Approvazione: {formatDateTime(request.approved_at)}</p>
              <p>Rifiuto: {formatDateTime(request.rejected_at)}</p>
              <p>Revisore: {reviewerLabel}</p>
              <p>Motivazione rifiuto: {request.rejection_reason ?? "-"}</p>
              <p>Note del coordinatore: {request.decision_notes ?? "-"}</p>
              <p>
                PDF storage:{" "}
                {request.pdf_storage_path ? request.pdf_storage_path : "-"}
              </p>
            </div>
          </section>

          <section className="rounded-[1.75rem] border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold tracking-tight text-zinc-950">
              Email
            </h2>
            <div className="mt-5 grid gap-3">
              {(deliveries ?? []).length > 0 ? (
                deliveries?.map((delivery) => (
                  <article
                    key={delivery.id}
                    className="rounded-2xl border border-zinc-200 p-4 text-sm leading-6 text-zinc-600"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="font-medium text-zinc-950">
                        {formatRecipientType(delivery.recipient_type)}
                      </p>
                      <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs font-medium text-zinc-700">
                        {formatDeliveryStatus(delivery.status)}
                      </span>
                    </div>
                    <p className="mt-2 break-words">{delivery.recipient_email}</p>
                    <p>Template: {delivery.template_key}</p>
                    <p>Tentativi: {delivery.attempt_count}</p>
                    <p>Ultimo tentativo: {formatDateTime(delivery.last_attempt_at)}</p>
                    <p>Invio: {formatDateTime(delivery.sent_at)}</p>
                    {delivery.error_message ? (
                      <p className="text-rose-700">
                        Errore: {delivery.error_message}
                      </p>
                    ) : null}
                  </article>
                ))
              ) : (
                <article className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm leading-6 text-zinc-600">
                  Nessuna email registrata per questa richiesta.
                </article>
              )}
            </div>
          </section>

          <section className="rounded-[1.75rem] border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold tracking-tight text-zinc-950">
              Timeline
            </h2>
            <div className="mt-5 grid gap-3">
              {(events ?? []).length > 0 ? (
                events?.map((event) => (
                  <article
                    key={event.id}
                    className="rounded-2xl border border-zinc-200 p-4 text-sm leading-6 text-zinc-600"
                  >
                    <p className="font-medium text-zinc-950">
                      {formatRequestEventType(event.event_type)}
                    </p>
                    <p>{formatDateTime(event.created_at)}</p>
                    <p>{formatActorType(event.actor_type)}</p>
                  </article>
                ))
              ) : (
                <article className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm leading-6 text-zinc-600">
                  Nessun evento registrato per questa richiesta.
                </article>
              )}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
