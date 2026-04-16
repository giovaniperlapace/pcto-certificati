import type { Tables } from "@/lib/supabase/database.types";

type DeliveryRequestBase = Pick<
  Tables<"certificate_requests">,
  | "approved_at"
  | "certificate_type"
  | "certificate_body_text"
  | "certificate_heading_text"
  | "class_label"
  | "hours_approved"
  | "hours_requested"
  | "id"
  | "pdf_generated_at"
  | "pdf_storage_path"
  | "school_emailed_at"
  | "school_name_snapshot"
  | "send_to_school"
  | "send_to_teacher"
  | "service_address_snapshot"
  | "service_name_snapshot"
  | "service_schedule_snapshot"
  | "student_email"
  | "student_emailed_at"
  | "student_first_name"
  | "student_last_name"
  | "teacher_email_snapshot"
  | "teacher_emailed_at"
  | "teacher_name_snapshot"
>;

export type CertificateDeliveryRequest = DeliveryRequestBase & {
  schoolEmail: string | null;
  schoolYearLabel: string;
};

export const CERTIFICATE_STORAGE_BUCKET = "certificate-pdfs";
export const CERTIFICATE_ASSETS_DIRECTORY = "public/certificate-assets";

export function getStudentFullName(request: CertificateDeliveryRequest) {
  return `${request.student_first_name} ${request.student_last_name}`;
}

export function formatCertificateTypeLabel(
  certificateType: CertificateDeliveryRequest["certificate_type"],
) {
  return certificateType === "pcto" ? "PCTO" : "Volontariato";
}

export function getCertificateTitle(request: CertificateDeliveryRequest) {
  return request.certificate_type === "pcto"
    ? "Attestazione attività di PCTO"
    : "Attestazione attività di volontariato";
}

export function formatItalianDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);

  return new Intl.DateTimeFormat("it-IT", {
    dateStyle: "long",
    timeZone: "Europe/Rome",
  }).format(date);
}

export function getApprovedHours(request: CertificateDeliveryRequest) {
  return request.hours_approved ?? request.hours_requested ?? null;
}

export function buildDefaultCertificateHeadingText(
  request: CertificateDeliveryRequest,
) {
  return request.certificate_type === "pcto"
    ? "OGGETTO: Attestazione attività di PCTO con la Comunità di Sant'Egidio"
    : "OGGETTO: Attestazione attività di volontariato con la Comunità di Sant'Egidio";
}

export function buildDefaultCertificateBodyText(
  request: CertificateDeliveryRequest,
) {
  const studentFullName = getStudentFullName(request);
  const hours = getApprovedHours(request);

  if (request.certificate_type === "pcto") {
    return [
      `Il sottoscritto Stefano Orlando, in qualità di responsabile delle attività giovanili della Comunità di Sant'Egidio, certifica che lo/la studente ${studentFullName}, della classe ${request.class_label} dell'istituto denominato "${request.school_name_snapshot}", nell'anno scolastico ${request.schoolYearLabel} ha partecipato ad un percorso di PCTO con la Comunità di Sant'Egidio con delle attività in favore delle persone vulnerabili o in stato di disagio a Roma, per un totale di ${hours ?? "..." } ore di servizio.`,
      `Le attività si sono svolte presso ${request.service_name_snapshot}, nella sede di ${request.service_address_snapshot}, con calendario ${request.service_schedule_snapshot}.`,
      "Questo documento è rilasciato come attestazione del contributo significativo e dell'impegno mostrato dall'individuo nelle attività svolte.",
    ].join("\n\n");
  }

  const volunteerHoursLine = hours
    ? `, per un totale di ${hours} ore di attività`
    : "";

  return [
    `Il sottoscritto Stefano Orlando, in qualità di responsabile delle attività giovanili della Comunità di Sant'Egidio, certifica che lo/la studente ${studentFullName}, della classe "${request.class_label}", dell'istituto denominato "${request.school_name_snapshot}", nell'anno scolastico ${request.schoolYearLabel} ha partecipato alle attività di volontariato condotte dalla Comunità di Sant'Egidio in favore delle persone vulnerabili o in stato di disagio a Roma${volunteerHoursLine}, nella sede di ${request.service_name_snapshot}, ${request.service_address_snapshot}.`,
    `Le attività si sono svolte con calendario ${request.service_schedule_snapshot}.`,
    "Questo documento è rilasciato come attestazione del contributo significativo e dell'impegno mostrato dall'individuo nelle attività svolte.",
  ].join("\n\n");
}

export function getCertificateHeadingText(
  request: CertificateDeliveryRequest,
) {
  return (
    request.certificate_heading_text?.trim() ||
    buildDefaultCertificateHeadingText(request)
  );
}

export function getCertificateBodyText(
  request: CertificateDeliveryRequest,
) {
  return (
    request.certificate_body_text?.trim() ||
    buildDefaultCertificateBodyText(request)
  );
}

export function buildCertificateBodyParagraphs(
  request: CertificateDeliveryRequest,
) {
  return getCertificateBodyText(request)
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

export function buildCertificateDetailRows(
  request: CertificateDeliveryRequest,
  issuedAt: Date,
) {
  const rows = [
    ["Data di emissione", formatItalianDate(issuedAt)],
    ["Anno scolastico", request.schoolYearLabel],
    ["Studente", getStudentFullName(request)],
    ["Classe", request.class_label],
    ["Scuola", request.school_name_snapshot],
    ["Servizio", request.service_name_snapshot],
    ["Sede", request.service_address_snapshot],
  ] as Array<readonly [string, string]>;

  const approvedHours = getApprovedHours(request);

  if (approvedHours) {
    rows.push(["Ore riconosciute", String(approvedHours)]);
  }

  return rows;
}

function slugifyFilePart(value: string) {
  return (
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "richiesta"
  );
}

export function buildCertificateFileName(request: CertificateDeliveryRequest) {
  return [
    "certificato",
    request.certificate_type,
    slugifyFilePart(request.student_last_name),
    slugifyFilePart(request.student_first_name),
  ].join("-") + ".pdf";
}

export function buildCertificateStoragePath(
  request: CertificateDeliveryRequest,
) {
  return `certificate-requests/${request.id}/${buildCertificateFileName(request)}`;
}
