import Link from "next/link";
import { notFound } from "next/navigation";
import { FlashMessage } from "@/components/admin/flash-message";
import { PageHeader } from "@/components/admin/page-header";
import { RequestStatusBadge } from "@/components/coordinator/request-status-badge";
import {
  approveCoordinatorRequestAction,
  generateCoordinatorRequestPdfAction,
  finalizeCoordinatorRequestDeliveryAction,
  rejectCoordinatorRequestAction,
  saveCoordinatorRequestAction,
} from "@/app/coordinatore/actions";
import {
  type CertificateDeliveryRequest,
} from "@/lib/certificates/content";
import {
  CERTIFICATE_TEMPLATE_PLACEHOLDERS,
  loadCertificateTemplate,
  resolveCertificateText,
} from "@/lib/certificates/templates";
import { requireCoordinator } from "@/lib/auth/admin";
import {
  buildCoordinatorRequestPath,
  canFinalizeRequestStatus,
  formatActorType,
  formatDateTime,
  formatRequestEventType,
  getRequestStatusMeta,
  isEditableRequestStatus,
} from "@/lib/coordinator/requests";
import { createAdminClient } from "@/lib/supabase/admin";

const fieldClassName =
  "w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-950";
const textareaClassName = `${fieldClassName} min-h-[120px]`;

type CoordinatorRequestDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

export default async function CoordinatorRequestDetailPage({
  params,
  searchParams,
}: CoordinatorRequestDetailPageProps) {
  const [{ id }, query, { supabase }] = await Promise.all([
    params,
    searchParams,
    requireCoordinator("/coordinatore"),
  ]);

  const requestPath = buildCoordinatorRequestPath(id);
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

  const [{ data: events, error: eventsError }, { data: deliveries, error: deliveriesError }] =
    await Promise.all([
      supabase
        .from("request_events")
        .select("id, actor_type, event_type, created_at")
        .eq("request_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("email_deliveries")
        .select(
          "id, recipient_type, recipient_email, template_key, status, last_attempt_at, sent_at, error_message, created_at",
        )
        .eq("request_id", id)
        .order("created_at", { ascending: false }),
    ]);

  if (eventsError) {
    throw eventsError;
  }

  if (deliveriesError) {
    throw deliveriesError;
  }

  const adminSupabase = createAdminClient();
  const [schoolResult, reviewerResult, schoolYearResult] = await Promise.all([
    request.school_id
      ? adminSupabase
          .from("schools")
          .select("school_email")
          .eq("id", request.school_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    request.reviewed_by_coordinator_id
      ? adminSupabase
          .from("coordinators")
          .select("first_name, last_name, email")
          .eq("id", request.reviewed_by_coordinator_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    adminSupabase
      .from("school_years")
      .select("label")
      .eq("id", request.school_year_id)
      .maybeSingle(),
  ]);

  if (schoolResult.error) {
    throw schoolResult.error;
  }

  if (reviewerResult.error) {
    throw reviewerResult.error;
  }

  if (schoolYearResult.error) {
    throw schoolYearResult.error;
  }

  const schoolEmail = schoolResult.data?.school_email ?? null;
  const reviewer = reviewerResult.data;
  const isEditable = isEditableRequestStatus(request.status);
  const canProcessDelivery = canFinalizeRequestStatus(request.status);
  const hasGeneratedPdf = Boolean(request.pdf_storage_path);
  const canGeneratePdf = canProcessDelivery && !hasGeneratedPdf;
  const canSendDelivery = canProcessDelivery && hasGeneratedPdf;
  const statusMeta = getRequestStatusMeta(request.status);
  const certificatePreviewRequest = {
    ...request,
    schoolEmail,
    schoolYearLabel: schoolYearResult.data?.label ?? "anno scolastico corrente",
  } as CertificateDeliveryRequest;
  const baseCertificateTemplate = await loadCertificateTemplate(
    request.certificate_type,
  );
  const resolvedCertificateText = await resolveCertificateText(certificatePreviewRequest);
  const certificateHeadingTemplateSource =
    request.certificate_heading_text ?? baseCertificateTemplate.headingTemplate;
  const certificateBodyTemplateSource =
    request.certificate_body_text ?? baseCertificateTemplate.bodyTemplate;
  const defaultCertificateHeading = resolvedCertificateText.headingText;
  const defaultCertificateBody = resolvedCertificateText.bodyText;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Richiesta coordinatore"
        title={`${request.student_first_name} ${request.student_last_name}`}
        description="Nel dettaglio puoi verificare i dati salvati, correggere gli snapshot utili al certificato e decidere se approvare o rifiutare la richiesta."
        actions={
          <Link
            href="/coordinatore"
            className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:border-zinc-950 hover:text-zinc-950"
          >
            Torna al dashboard
          </Link>
        }
      />

      <FlashMessage error={query.error ?? null} success={query.success ?? null} />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-[1.75rem] border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-zinc-600">Stato</p>
          <div className="mt-3 flex items-center gap-2">
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
            Ultimo aggiornamento {formatDateTime(request.updated_at)}
          </p>
        </article>

        <article className="rounded-[1.75rem] border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-zinc-600">Destinatari finali</p>
          <div className="mt-2 space-y-1 text-sm text-zinc-600">
            <p>Studente: {request.student_email}</p>
            <p>Scuola: {schoolEmail ?? "non disponibile"}</p>
            <p>Docente: {request.teacher_email_snapshot ?? "non disponibile"}</p>
          </div>
        </article>

        <article className="rounded-[1.75rem] border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-zinc-600">Stato consegna</p>
          <div className="mt-2 space-y-1 text-sm text-zinc-600">
            <p>PDF: {request.pdf_generated_at ? "Generato" : "Non generato"}</p>
            <p>
              Studente: {request.student_emailed_at ? "Inviato" : "Non inviato"}
            </p>
            <p>Scuola: {request.school_emailed_at ? "Inviato" : "Non inviato"}</p>
            <p>
              Docente: {request.teacher_emailed_at ? "Inviato" : "Non inviato"}
            </p>
          </div>
        </article>
      </section>

      <section className="grid gap-8 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <div className="space-y-8">
          <section className="rounded-[1.75rem] border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="border-b border-zinc-200 pb-4">
              <h2 className="text-xl font-semibold tracking-tight text-zinc-950">
                Revisione della richiesta
              </h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-zinc-600">
                Qui puoi correggere i dati prima della chiusura. Il sistema usa il
                timestamp di revisione corrente per evitare che due coordinatori
                salvino o chiudano la stessa richiesta senza accorgersene.
              </p>
            </div>

            {isEditable ? (
              <form className="mt-6 space-y-8">
                <input type="hidden" name="id" value={request.id} />
                <input
                  type="hidden"
                  name="current_updated_at"
                  value={request.updated_at}
                />
                <input type="hidden" name="redirect_to" value={requestPath} />

                <fieldset className="space-y-4">
                  <legend className="text-sm font-semibold uppercase tracking-[0.24em] text-zinc-500">
                    Dati studente
                  </legend>
                  <div className="grid gap-5 md:grid-cols-2">
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-zinc-800">Nome</span>
                      <input
                        required
                        type="text"
                        name="student_first_name"
                        defaultValue={request.student_first_name}
                        maxLength={120}
                        className={fieldClassName}
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-zinc-800">Cognome</span>
                      <input
                        required
                        type="text"
                        name="student_last_name"
                        defaultValue={request.student_last_name}
                        maxLength={120}
                        className={fieldClassName}
                      />
                    </label>
                    <label className="space-y-2 md:col-span-2">
                      <span className="text-sm font-medium text-zinc-800">
                        Email studente
                      </span>
                      <input
                        required
                        type="email"
                        name="student_email"
                        defaultValue={request.student_email}
                        maxLength={320}
                        className={fieldClassName}
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-zinc-800">Classe</span>
                      <input
                        required
                        type="text"
                        name="class_label"
                        defaultValue={request.class_label}
                        maxLength={80}
                        className={fieldClassName}
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-zinc-800">
                        Tipo certificato
                      </span>
                      <select
                        required
                        name="certificate_type"
                        defaultValue={request.certificate_type}
                        className={fieldClassName}
                      >
                        <option value="pcto">PCTO</option>
                        <option value="volontariato">Volontariato</option>
                      </select>
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-zinc-800">
                        Ore richieste
                      </span>
                      <input
                        type="number"
                        name="hours_requested"
                        min={1}
                        step={1}
                        defaultValue={request.hours_requested ?? ""}
                        className={fieldClassName}
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-zinc-800">
                        Ore approvate
                      </span>
                      <input
                        type="number"
                        name="hours_approved"
                        min={1}
                        step={1}
                        defaultValue={request.hours_approved ?? request.hours_requested ?? ""}
                        className={fieldClassName}
                      />
                    </label>
                    <label className="space-y-2 md:col-span-2">
                      <span className="text-sm font-medium text-zinc-800">
                        Note studente
                      </span>
                      <textarea
                        name="student_notes"
                        defaultValue={request.student_notes ?? ""}
                        rows={4}
                        className={textareaClassName}
                      />
                    </label>
                  </div>
                </fieldset>

                <fieldset className="space-y-4">
                  <legend className="text-sm font-semibold uppercase tracking-[0.24em] text-zinc-500">
                    Snapshot per certificato
                  </legend>
                  <div className="grid gap-5 md:grid-cols-2">
                    <label className="space-y-2 md:col-span-2">
                      <span className="text-sm font-medium text-zinc-800">Scuola</span>
                      <input
                        required
                        type="text"
                        name="school_name_snapshot"
                        defaultValue={request.school_name_snapshot}
                        maxLength={200}
                        className={fieldClassName}
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-zinc-800">
                        Nome docente
                      </span>
                      <input
                        type="text"
                        name="teacher_name_snapshot"
                        defaultValue={request.teacher_name_snapshot ?? ""}
                        maxLength={160}
                        className={fieldClassName}
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-zinc-800">
                        Email docente
                      </span>
                      <input
                        type="email"
                        name="teacher_email_snapshot"
                        defaultValue={request.teacher_email_snapshot ?? ""}
                        maxLength={320}
                        className={fieldClassName}
                      />
                    </label>
                    <label className="space-y-2 md:col-span-2">
                      <span className="text-sm font-medium text-zinc-800">Servizio</span>
                      <input
                        required
                        type="text"
                        name="service_name_snapshot"
                        defaultValue={request.service_name_snapshot}
                        maxLength={200}
                        className={fieldClassName}
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-zinc-800">Orario</span>
                      <input
                        required
                        type="text"
                        name="service_schedule_snapshot"
                        defaultValue={request.service_schedule_snapshot}
                        maxLength={200}
                        className={fieldClassName}
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-zinc-800">
                        Indirizzo
                      </span>
                      <input
                        required
                        type="text"
                        name="service_address_snapshot"
                        defaultValue={request.service_address_snapshot}
                        maxLength={240}
                        className={fieldClassName}
                      />
                    </label>
                  </div>
                </fieldset>

                <fieldset className="space-y-4">
                  <legend className="text-sm font-semibold uppercase tracking-[0.24em] text-zinc-500">
                    Decisione
                  </legend>
                  <div className="grid gap-5 md:grid-cols-2">
                    <label className="flex items-start gap-3 rounded-2xl border border-zinc-200 p-4 text-sm leading-6 text-zinc-600">
                      <input
                        type="checkbox"
                        name="send_to_school"
                        defaultChecked={request.send_to_school}
                        disabled={!schoolEmail}
                        className="mt-1 h-4 w-4 rounded border-zinc-300 text-zinc-950 focus:ring-zinc-950"
                      />
                      <span>
                        Invia una copia alla scuola.
                        <br />
                        <span className="text-zinc-500">
                          {schoolEmail
                            ? `Email disponibile: ${schoolEmail}`
                            : "Nessuna email scuola disponibile nella scheda anagrafica."}
                        </span>
                      </span>
                    </label>
                    <label className="flex items-start gap-3 rounded-2xl border border-zinc-200 p-4 text-sm leading-6 text-zinc-600">
                      <input
                        type="checkbox"
                        name="send_to_teacher"
                        defaultChecked={request.send_to_teacher}
                        className="mt-1 h-4 w-4 rounded border-zinc-300 text-zinc-950 focus:ring-zinc-950"
                      />
                      <span>
                        Invia una copia al docente.
                        <br />
                        <span className="text-zinc-500">
                          {request.teacher_email_snapshot
                            ? `Email docente corrente: ${request.teacher_email_snapshot}`
                            : "Puoi valorizzare l'email docente sopra e poi attivare questo flag nello stesso salvataggio."}
                        </span>
                      </span>
                    </label>
                    <label className="space-y-2 md:col-span-2">
                      <span className="text-sm font-medium text-zinc-800">
                        Note del coordinatore
                      </span>
                      <textarea
                        name="decision_notes"
                        defaultValue={request.decision_notes ?? ""}
                        rows={4}
                        className={textareaClassName}
                      />
                    </label>
                    <label className="space-y-2 md:col-span-2">
                      <span className="text-sm font-medium text-zinc-800">
                        Motivazione del rifiuto
                      </span>
                      <textarea
                        name="rejection_reason"
                        defaultValue={request.rejection_reason ?? ""}
                        rows={4}
                        className={textareaClassName}
                      />
                      <p className="text-xs leading-5 text-zinc-500">
                        Obbligatoria solo se scegli di rifiutare la richiesta.
                      </p>
                    </label>
                  </div>
                </fieldset>

                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm leading-6 text-zinc-600">
                  Salvataggio, approvazione e rifiuto verificano che il record non
                  sia cambiato nel frattempo. Se un altro coordinatore aggiorna la
                  stessa richiesta prima di te, vedrai un messaggio e potrai
                  ricaricare il dettaglio con i dati piu&apos; recenti.
                </div>

                <details className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                  <summary className="cursor-pointer text-sm font-medium text-zinc-900">
                    Personalizza il testo del certificato per questa richiesta
                    <span className="ml-2 font-normal text-zinc-500">(opzionale)</span>
                  </summary>
                  <div className="mt-4 space-y-4">
                    <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm leading-6 text-zinc-600">
                      Se lasci vuoti i campi qui sotto, il sistema usera&apos; il testo
                      standard deciso dall&apos;admin. Se invece li modifichi, il testo
                      personalizzato verra&apos; usato solo per questa richiesta.
                    </div>
                    <div className="grid gap-5">
                      <label className="space-y-2">
                        <span className="text-sm font-medium text-zinc-800">
                          Intestazione personalizzata
                        </span>
                        <textarea
                          name="certificate_heading_text"
                          defaultValue={certificateHeadingTemplateSource}
                          rows={3}
                          placeholder={defaultCertificateHeading}
                          className={textareaClassName}
                        />
                        <p className="text-xs leading-5 text-zinc-500">
                          Puoi usare gli stessi placeholder disponibili nella dashboard admin.
                        </p>
                      </label>
                      <label className="space-y-2">
                        <span className="text-sm font-medium text-zinc-800">
                          Testo personalizzato
                        </span>
                        <textarea
                          name="certificate_body_text"
                          defaultValue={certificateBodyTemplateSource}
                          rows={10}
                          placeholder={defaultCertificateBody}
                          className={textareaClassName}
                        />
                      </label>
                      <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                          Placeholder disponibili
                        </p>
                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                          {CERTIFICATE_TEMPLATE_PLACEHOLDERS.map((placeholder) => (
                            <article
                              key={placeholder.token}
                              className="rounded-2xl border border-zinc-200 p-3"
                            >
                              <p className="font-mono text-xs text-zinc-950">
                                {placeholder.token}
                              </p>
                              <p className="mt-1 text-xs leading-5 text-zinc-600">
                                {placeholder.description}
                              </p>
                            </article>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </details>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="submit"
                    formAction={saveCoordinatorRequestAction}
                    className="rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm font-medium text-zinc-700 transition hover:border-zinc-950 hover:text-zinc-950"
                  >
                    Salva modifiche
                  </button>
                  <button
                    type="submit"
                    formAction={approveCoordinatorRequestAction}
                    className="rounded-full bg-zinc-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-800"
                  >
                    Approva richiesta
                  </button>
                  <button
                    type="submit"
                    formAction={rejectCoordinatorRequestAction}
                    className="rounded-full border border-rose-200 bg-rose-50 px-5 py-3 text-sm font-medium text-rose-700 transition hover:border-rose-300 hover:bg-rose-100"
                  >
                    Rifiuta richiesta
                  </button>
                </div>
              </form>
            ) : (
              <div className="mt-6 space-y-4">
                <article className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 text-sm leading-6 text-zinc-600">
                  Questa richiesta non e&apos; piu&apos; modificabile dal dashboard
                  perche&apos; lo stato attuale e&apos;{" "}
                  <strong>{statusMeta.label.toLowerCase()}</strong>.
                  I dati della pratica restano visibili come storico, mentre sotto
                  puoi ancora gestire generazione PDF, download e invio quando lo
                  stato lo consente.
                </article>

                {(canGeneratePdf || canSendDelivery || request.pdf_storage_path) && (
                  <div className="flex flex-wrap gap-3">
                    {canGeneratePdf ? (
                      <form action={generateCoordinatorRequestPdfAction} className="w-full space-y-4">
                        <input type="hidden" name="id" value={request.id} />
                        <input
                          type="hidden"
                          name="current_updated_at"
                          value={request.updated_at}
                        />
                        <input type="hidden" name="redirect_to" value={requestPath} />
                        <details className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                          <summary className="cursor-pointer text-sm font-medium text-zinc-900">
                            Personalizza il testo del certificato
                            <span className="ml-2 font-normal text-zinc-500">(opzionale)</span>
                          </summary>
                          <div className="mt-4 space-y-4">
                            <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm leading-6 text-zinc-600">
                              Dopo l&apos;approvazione puoi ancora adattare il testo di
                              questo certificato. Quando generi il PDF, il template
                              globale dell&apos;admin resta il punto di partenza ma le
                              modifiche salvate qui valgono solo per questa pratica.
                            </div>
                            <label className="space-y-2">
                              <span className="text-sm font-medium text-zinc-800">
                                Intestazione personalizzata
                              </span>
                              <textarea
                                name="certificate_heading_text"
                                defaultValue={certificateHeadingTemplateSource}
                                rows={3}
                                placeholder={defaultCertificateHeading}
                                className={textareaClassName}
                              />
                            </label>
                            <label className="space-y-2">
                              <span className="text-sm font-medium text-zinc-800">
                                Testo personalizzato
                              </span>
                              <textarea
                                name="certificate_body_text"
                                defaultValue={certificateBodyTemplateSource}
                                rows={10}
                                placeholder={defaultCertificateBody}
                                className={textareaClassName}
                              />
                            </label>
                            <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-4">
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                                Placeholder disponibili
                              </p>
                              <div className="mt-3 grid gap-3 md:grid-cols-2">
                                {CERTIFICATE_TEMPLATE_PLACEHOLDERS.map((placeholder) => (
                                  <article
                                    key={placeholder.token}
                                    className="rounded-2xl border border-zinc-200 p-3"
                                  >
                                    <p className="font-mono text-xs text-zinc-950">
                                      {placeholder.token}
                                    </p>
                                    <p className="mt-1 text-xs leading-5 text-zinc-600">
                                      {placeholder.description}
                                    </p>
                                  </article>
                                ))}
                              </div>
                            </div>
                          </div>
                        </details>
                        <button
                          type="submit"
                          className="rounded-full bg-zinc-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-800"
                        >
                          Genera PDF
                        </button>
                      </form>
                    ) : null}

                    {request.pdf_storage_path ? (
                      <Link
                        href={`${requestPath}/certificato`}
                        className="rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm font-medium text-zinc-700 transition hover:border-zinc-950 hover:text-zinc-950"
                      >
                        Scarica PDF
                      </Link>
                    ) : null}

                    {canSendDelivery ? (
                      <form action={finalizeCoordinatorRequestDeliveryAction}>
                        <input type="hidden" name="id" value={request.id} />
                        <input
                          type="hidden"
                          name="current_updated_at"
                          value={request.updated_at}
                        />
                        <input type="hidden" name="redirect_to" value={requestPath} />
                        <button
                          type="submit"
                          className="rounded-full bg-zinc-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-800"
                        >
                          {request.status === "approved"
                            ? "Invia certificato"
                            : "Riprova invio certificato"}
                        </button>
                      </form>
                    ) : null}
                  </div>
                )}

                <div className="grid gap-4 md:grid-cols-2">
                  {[
                    ["Studente", `${request.student_first_name} ${request.student_last_name}`],
                    ["Email studente", request.student_email],
                    ["Classe", request.class_label],
                    [
                      "Tipo certificato",
                      request.certificate_type === "pcto" ? "PCTO" : "Volontariato",
                    ],
                    ["Ore richieste", request.hours_requested?.toString() ?? "-"],
                    ["Ore approvate", request.hours_approved?.toString() ?? "-"],
                    ["Scuola", request.school_name_snapshot],
                    ["Servizio", request.service_name_snapshot],
                    ["Orario servizio", request.service_schedule_snapshot],
                    ["Indirizzo servizio", request.service_address_snapshot],
                    ["Docente", request.teacher_name_snapshot ?? "-"],
                    ["Email docente", request.teacher_email_snapshot ?? "-"],
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
              </div>
            )}
          </section>
        </div>

        <div className="space-y-8">
          <section className="rounded-[1.75rem] border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold tracking-tight text-zinc-950">
              Timeline pratica
            </h2>
            <div className="mt-5 space-y-4">
              {events && events.length > 0 ? (
                events.map((event) => (
                  <article
                    key={event.id}
                    className="rounded-2xl border border-zinc-200 p-4"
                  >
                    <p className="text-sm font-medium text-zinc-950">
                      {formatRequestEventType(event.event_type)}
                    </p>
                    <p className="mt-1 text-sm text-zinc-600">
                      {formatActorType(event.actor_type)} · {formatDateTime(event.created_at)}
                    </p>
                  </article>
                ))
              ) : (
                <p className="text-sm text-zinc-600">Nessun evento registrato.</p>
              )}
            </div>
          </section>

          <section className="rounded-[1.75rem] border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold tracking-tight text-zinc-950">
              Consegne registrate
            </h2>
            <div className="mt-5 space-y-4">
              {deliveries && deliveries.length > 0 ? (
                deliveries.map((delivery) => (
                  <article
                    key={delivery.id}
                    className="rounded-2xl border border-zinc-200 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium text-zinc-950">
                        {delivery.recipient_type} · {delivery.recipient_email}
                      </p>
                      <span
                        className={[
                          "rounded-full border px-2.5 py-1 text-xs font-medium",
                          delivery.status === "sent"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : delivery.status === "failed"
                              ? "border-rose-200 bg-rose-50 text-rose-700"
                              : "border-zinc-200 bg-zinc-100 text-zinc-700",
                        ].join(" ")}
                      >
                        {delivery.status}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-zinc-600">
                      Template {delivery.template_key}
                    </p>
                    <p className="mt-1 text-sm text-zinc-500">
                      Creata {formatDateTime(delivery.created_at)}
                      {delivery.sent_at
                        ? ` · Inviata ${formatDateTime(delivery.sent_at)}`
                        : delivery.last_attempt_at
                          ? ` · Ultimo tentativo ${formatDateTime(delivery.last_attempt_at)}`
                          : ""}
                    </p>
                    {delivery.error_message ? (
                      <p className="mt-2 text-sm text-rose-700">
                        {delivery.error_message}
                      </p>
                    ) : null}
                  </article>
                ))
              ) : (
                <p className="text-sm text-zinc-600">Nessuna consegna registrata.</p>
              )}
            </div>
          </section>

          <section className="rounded-[1.75rem] border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold tracking-tight text-zinc-950">
              Stato revisione
            </h2>
            <div className="mt-5 space-y-3 text-sm leading-6 text-zinc-600">
              <p>
                Revisione avviata: {formatDateTime(request.reviewed_at)}
              </p>
              <p>Approvazione: {formatDateTime(request.approved_at)}</p>
              <p>Rifiuto: {formatDateTime(request.rejected_at)}</p>
              <p>
                Revisore: {reviewer ? `${reviewer.first_name} ${reviewer.last_name}` : "-"}
              </p>
              <p>PDF storage path: {request.pdf_storage_path ?? "-"}</p>
              <p>
                Download PDF:{" "}
                {request.pdf_storage_path ? (
                  <Link
                    href={`${requestPath}/certificato`}
                    className="font-medium text-zinc-950 underline underline-offset-4"
                  >
                    Scarica certificato
                  </Link>
                ) : (
                  "-"
                )}
              </p>
              <p>Motivazione rifiuto: {request.rejection_reason ?? "-"}</p>
              <p>Note del coordinatore: {request.decision_notes ?? "-"}</p>
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
