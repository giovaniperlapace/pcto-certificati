import { createAdminClient } from "@/lib/supabase/admin";
import type { Tables } from "@/lib/supabase/database.types";
import {
  formatCertificateTypeLabel,
  formatItalianDate,
  getApprovedHours,
  getStudentFullName,
  type CertificateDeliveryRequest,
} from "@/lib/certificates/content";

type CertificateType = Tables<"certificate_templates">["certificate_type"];

type CertificateTemplateDefinition = {
  bodyTemplate: string;
  headingTemplate: string;
};

type PlaceholderDefinition = {
  description: string;
  token: string;
};

const DEFAULT_CERTIFICATE_TEMPLATES: Record<
  CertificateType,
  CertificateTemplateDefinition
> = {
  pcto: {
    headingTemplate:
      "OGGETTO: Attestazione attivita' di PCTO con la Comunita' di Sant'Egidio",
    bodyTemplate: [
      "Il sottoscritto Stefano Orlando, in qualita' di responsabile delle attivita' giovanili della Comunita' di Sant'Egidio, certifica che lo/la studente {{student_full_name}}, della classe {{class_label}} dell'istituto denominato \"{{school_name}}\", nell'anno scolastico {{school_year}} ha partecipato ad un percorso di PCTO con la Comunita' di Sant'Egidio con delle attivita' in favore delle persone vulnerabili o in stato di disagio a Roma, per un totale di {{approved_hours}} ore di servizio.",
      "Le attivita' si sono svolte presso {{service_name}}, nella sede di {{service_address}}, con calendario {{service_schedule}}.",
      "Questo documento e' rilasciato come attestazione del contributo significativo e dell'impegno mostrato dall'individuo nelle attivita' svolte.",
    ].join("\n\n"),
  },
  volontariato: {
    headingTemplate:
      "OGGETTO: Attestazione attivita' di volontariato con la Comunita' di Sant'Egidio",
    bodyTemplate: [
      "Il sottoscritto Stefano Orlando, in qualita' di responsabile delle attivita' giovanili della Comunita' di Sant'Egidio, certifica che lo/la studente {{student_full_name}}, della classe \"{{class_label}}\", dell'istituto denominato \"{{school_name}}\", nell'anno scolastico {{school_year}} ha partecipato alle attivita' di volontariato condotte dalla Comunita' di Sant'Egidio in favore delle persone vulnerabili o in stato di disagio a Roma{{volunteer_hours_clause}}, nella sede di {{service_name}}, {{service_address}}.",
      "Le attivita' si sono svolte con calendario {{service_schedule}}.",
      "Questo documento e' rilasciato come attestazione del contributo significativo e dell'impegno mostrato dall'individuo nelle attivita' svolte.",
    ].join("\n\n"),
  },
};

const PLACEHOLDER_PATTERN = /\{\{\s*([a-z0-9_]+)\s*\}\}/g;

export const CERTIFICATE_TEMPLATE_PLACEHOLDERS: PlaceholderDefinition[] = [
  {
    token: "{{student_first_name}}",
    description: "Nome dello studente.",
  },
  {
    token: "{{student_last_name}}",
    description: "Cognome dello studente.",
  },
  {
    token: "{{student_full_name}}",
    description: "Nome e cognome completi dello studente.",
  },
  {
    token: "{{student_email}}",
    description: "Email dello studente.",
  },
  {
    token: "{{class_label}}",
    description: "Classe indicata nella richiesta.",
  },
  {
    token: "{{school_name}}",
    description: "Nome della scuola salvato nella richiesta.",
  },
  {
    token: "{{school_year}}",
    description: "Anno scolastico della richiesta.",
  },
  {
    token: "{{certificate_type_label}}",
    description: "Etichetta leggibile del tipo certificato.",
  },
  {
    token: "{{service_name}}",
    description: "Nome del servizio.",
  },
  {
    token: "{{service_schedule}}",
    description: "Calendario/orario del servizio.",
  },
  {
    token: "{{service_address}}",
    description: "Indirizzo del servizio.",
  },
  {
    token: "{{approved_hours}}",
    description: "Ore approvate o richieste, se disponibili.",
  },
  {
    token: "{{volunteer_hours_clause}}",
    description:
      "Frase opzionale per il volontariato: aggiunge ', per un totale di X ore di attivita'' oppure resta vuota.",
  },
  {
    token: "{{issued_at}}",
    description: "Data di emissione del certificato in formato italiano.",
  },
];

function getPlaceholderKey(token: string) {
  return token.slice(2, -2).trim();
}

function normalizeTemplateText(value: string) {
  return value.replace(/\r\n/g, "\n").trim();
}

function getPlaceholderValues(
  request: CertificateDeliveryRequest,
  issuedAt: Date,
) {
  const approvedHours = getApprovedHours(request);

  return {
    approved_hours: approvedHours ? String(approvedHours) : "",
    certificate_type_label: formatCertificateTypeLabel(request.certificate_type),
    class_label: request.class_label,
    issued_at: formatItalianDate(issuedAt),
    school_name: request.school_name_snapshot,
    school_year: request.schoolYearLabel,
    service_address: request.service_address_snapshot,
    service_name: request.service_name_snapshot,
    service_schedule: request.service_schedule_snapshot,
    student_email: request.student_email,
    student_first_name: request.student_first_name,
    student_full_name: getStudentFullName(request),
    student_last_name: request.student_last_name,
    volunteer_hours_clause: approvedHours
      ? `, per un totale di ${approvedHours} ore di attivita'`
      : "",
  } as const;
}

export function getDefaultCertificateTemplate(
  certificateType: CertificateType,
) {
  return DEFAULT_CERTIFICATE_TEMPLATES[certificateType];
}

export async function loadCertificateTemplates() {
  const adminSupabase = createAdminClient();
  const { data, error } = await adminSupabase
    .from("certificate_templates")
    .select("certificate_type, heading_template, body_template");

  if (error) {
    throw error;
  }

  const templates = {
    pcto: getDefaultCertificateTemplate("pcto"),
    volontariato: getDefaultCertificateTemplate("volontariato"),
  } satisfies Record<CertificateType, CertificateTemplateDefinition>;

  for (const row of data ?? []) {
    templates[row.certificate_type] = {
      headingTemplate: normalizeTemplateText(row.heading_template),
      bodyTemplate: normalizeTemplateText(row.body_template),
    };
  }

  return templates;
}

export async function loadCertificateTemplate(
  certificateType: CertificateType,
) {
  const templates = await loadCertificateTemplates();
  return templates[certificateType];
}

export function validateCertificateTemplateText(
  fieldLabel: string,
  templateText: string,
) {
  const invalidTokens = Array.from(
    new Set(
      Array.from(templateText.matchAll(PLACEHOLDER_PATTERN))
        .map((match) => match[0] ?? "")
        .filter((token) => {
          const key = matchPlaceholderKey(token);
          return !(key in getPlaceholderValuesForValidation);
        }),
    ),
  );

  if (invalidTokens.length > 0) {
    throw new Error(
      `Il campo ${fieldLabel} contiene placeholder non riconosciuti: ${invalidTokens.join(", ")}.`,
    );
  }
}

const getPlaceholderValuesForValidation = {
  approved_hours: true,
  certificate_type_label: true,
  class_label: true,
  issued_at: true,
  school_name: true,
  school_year: true,
  service_address: true,
  service_name: true,
  service_schedule: true,
  student_email: true,
  student_first_name: true,
  student_full_name: true,
  student_last_name: true,
  volunteer_hours_clause: true,
} as const;

function matchPlaceholderKey(token: string) {
  return getPlaceholderKey(token) as keyof typeof getPlaceholderValuesForValidation;
}

export function renderCertificateTemplateText(params: {
  issuedAt?: Date;
  request: CertificateDeliveryRequest;
  templateText: string;
}) {
  const issuedAt =
    params.issuedAt ??
    (params.request.approved_at ? new Date(params.request.approved_at) : new Date());
  const placeholderValues = getPlaceholderValues(params.request, issuedAt);

  return normalizeTemplateText(params.templateText).replace(
    PLACEHOLDER_PATTERN,
    (token, placeholderKey: keyof typeof placeholderValues) =>
      placeholderValues[placeholderKey] ?? token,
  );
}

export async function resolveCertificateText(
  request: CertificateDeliveryRequest,
) {
  const template = await loadCertificateTemplate(request.certificate_type);

  const headingTemplate =
    request.certificate_heading_text?.trim() || template.headingTemplate;
  const bodyTemplate = request.certificate_body_text?.trim() || template.bodyTemplate;

  return {
    headingText: renderCertificateTemplateText({
      request,
      templateText: headingTemplate,
    }),
    bodyText: renderCertificateTemplateText({
      request,
      templateText: bodyTemplate,
    }),
  };
}
