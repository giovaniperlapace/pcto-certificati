"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  createAdminClient,
  listAuthUsersByIds,
} from "@/lib/supabase/admin";
import {
  readOptionalString,
  readRequiredString,
} from "@/lib/utils/form-data";

const REQUEST_FORM_PATH = "/richiedi-certificato";
const REQUEST_CONFIRMATION_PATH = "/richiedi-certificato/conferma";
const ACTIVE_DUPLICATE_STATUSES = [
  "submitted",
  "approved",
  "completed",
  "delivery_failed",
] as const;
const RECENT_SUBMISSION_WINDOW_MINUTES = 5;
const RECENT_SUBMISSION_LIMIT = 3;

type SubmissionMode = "existing" | "manual";

type NotificationRecipient = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
};

type ManualSchoolInput = {
  name: string;
  address: string;
  teacherName: string | null;
};

type ManualServiceInput = {
  serviceType: string;
  district: string;
  managerName: string;
};

function redirectToForm(type: "error" | "success", message: string) {
  redirect(`${REQUEST_FORM_PATH}?${type}=${encodeURIComponent(message)}`);
}

function isNextRedirectError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const digest = (error as { digest?: unknown }).digest;

  if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) {
    return true;
  }

  return error instanceof Error && error.message === "NEXT_REDIRECT";
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateLength(label: string, value: string, maxLength: number) {
  if (value.length > maxLength) {
    throw new Error(
      `Il campo ${label} supera la lunghezza massima di ${maxLength} caratteri.`,
    );
  }
}

function readCertificateType(formData: FormData) {
  const value = readRequiredString(formData, "certificate_type");

  if (value !== "pcto" && value !== "volontariato") {
    throw new Error("Il tipo di certificato selezionato non e' valido.");
  }

  return value;
}

function readPositiveInteger(formData: FormData, key: string) {
  const value = readOptionalString(formData, key);

  if (!value) {
    return null;
  }

  if (!/^\d+$/.test(value)) {
    throw new Error(`Il campo ${key} deve contenere un numero intero positivo.`);
  }

  const parsed = Number.parseInt(value, 10);

  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`Il campo ${key} deve contenere un numero intero positivo.`);
  }

  return parsed;
}

function readSubmissionMode(
  formData: FormData,
  key: string,
): SubmissionMode {
  return formData.get(key) === "manual" ? "manual" : "existing";
}

function readRequiredField(
  formData: FormData,
  key: string,
  label: string,
) {
  const value = readOptionalString(formData, key);

  if (!value) {
    throw new Error(`Il campo ${label} e' obbligatorio.`);
  }

  return value;
}

function readManualSchoolInput(formData: FormData): ManualSchoolInput {
  const name = readRequiredField(
    formData,
    "missing_school_name",
    "nome della scuola",
  );
  const address = readRequiredField(
    formData,
    "missing_school_address",
    "indirizzo della scuola",
  );
  const teacherName = readOptionalString(formData, "missing_school_teacher_name");

  validateLength("nome della scuola", name, 200);
  validateLength("indirizzo della scuola", address, 240);

  if (teacherName) {
    validateLength(
      "nome del docente che segue le attivita' extra scolastiche",
      teacherName,
      160,
    );
  }

  return {
    name,
    address,
    teacherName,
  };
}

function readManualServiceInput(formData: FormData): ManualServiceInput {
  const serviceType = readRequiredField(
    formData,
    "missing_service_type",
    "tipo di servizio",
  );
  const district = readRequiredField(
    formData,
    "missing_service_district",
    "quartiere",
  );
  const managerName = readRequiredField(
    formData,
    "missing_service_manager_name",
    "nome del responsabile del servizio di Sant'Egidio",
  );

  validateLength("tipo di servizio", serviceType, 160);
  validateLength("quartiere", district, 160);
  validateLength(
    "nome del responsabile del servizio di Sant'Egidio",
    managerName,
    160,
  );

  return {
    serviceType,
    district,
    managerName,
  };
}

function buildServiceScheduleSnapshot(service: {
  weekday: string;
  schedule_label: string;
}) {
  return `${service.weekday} - ${service.schedule_label}`;
}

function buildServiceAddressSnapshot(service: { address: string; city: string }) {
  return [service.address, service.city].filter(Boolean).join(", ");
}

function isNotificationRecipient(
  value: NotificationRecipient | undefined,
): value is NotificationRecipient {
  return value !== undefined;
}

async function getSubmissionIpHash() {
  const headerStore = await headers();
  const forwardedFor = headerStore.get("x-forwarded-for");
  const realIp = headerStore.get("x-real-ip");
  const candidate = forwardedFor?.split(",")[0]?.trim() || realIp?.trim();

  if (!candidate) {
    return null;
  }

  return createHash("sha256").update(candidate).digest("hex");
}

async function ensureRecentSubmissionLimit(
  supabase: ReturnType<typeof createAdminClient>,
  submissionIpHash: string | null,
) {
  if (!submissionIpHash) {
    return;
  }

  const submittedAfter = new Date(
    Date.now() - RECENT_SUBMISSION_WINDOW_MINUTES * 60 * 1000,
  ).toISOString();

  const { count, error } = await supabase
    .from("certificate_requests")
    .select("*", {
      count: "exact",
      head: true,
    })
    .eq("submission_ip_hash", submissionIpHash)
    .gte("submitted_at", submittedAfter);

  if (error) {
    throw error;
  }

  if ((count ?? 0) >= RECENT_SUBMISSION_LIMIT) {
    throw new Error(
      "Hai inviato troppe richieste in pochi minuti. Attendi un momento e riprova.",
    );
  }
}

async function findExistingDuplicateRequest(
  supabase: ReturnType<typeof createAdminClient>,
  params: {
    schoolYearId: string;
    certificateType: "pcto" | "volontariato";
    studentEmail: string;
  } & (
    | {
        serviceMode: "existing";
        serviceId: string;
      }
    | {
        serviceMode: "manual";
        serviceNameSnapshot: string;
        serviceAddressSnapshot: string;
      }
  ),
) {
  let query = supabase
    .from("certificate_requests")
    .select("id, student_email")
    .eq("school_year_id", params.schoolYearId)
    .eq("certificate_type", params.certificateType)
    .in("status", [...ACTIVE_DUPLICATE_STATUSES]);

  if (params.serviceMode === "existing") {
    query = query.eq("service_id", params.serviceId);
  } else {
    query = query
      .is("service_id", null)
      .eq("service_name_snapshot", params.serviceNameSnapshot)
      .eq("service_address_snapshot", params.serviceAddressSnapshot);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (
    data.find(
      (request) =>
        request.student_email.trim().toLowerCase() === params.studentEmail,
    ) ?? null
  );
}

async function loadAdminNotificationRecipients(
  supabase: ReturnType<typeof createAdminClient>,
) {
  const { data: adminRoles, error: adminRolesError } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("role", "admin");

  if (adminRolesError) {
    throw adminRolesError;
  }

  const adminUserIds = [...new Set((adminRoles ?? []).map((role) => role.user_id))];

  if (adminUserIds.length === 0) {
    throw new Error("Non risultano utenti admin configurati per ricevere la richiesta.");
  }

  const authUsers = await listAuthUsersByIds(supabase, adminUserIds);
  const recipients = authUsers
    .filter((user) => Boolean(user.email))
    .map((user) => ({
      id: user.id,
      first_name: "Admin",
      last_name: "Certificati",
      email: user.email ?? "",
    }));

  if (recipients.length === 0) {
    throw new Error("Gli utenti admin configurati non hanno un'email disponibile.");
  }

  return recipients;
}

export async function submitCertificateRequestAction(formData: FormData) {
  const honeypot = readOptionalString(formData, "website");

  if (honeypot) {
    redirect(REQUEST_CONFIRMATION_PATH);
  }

  try {
    if (formData.get("privacy_consent") !== "on") {
      throw new Error(
        "Per inviare la richiesta devi confermare l'informativa privacy.",
      );
    }

    const supabase = createAdminClient();
    const studentFirstName = readRequiredString(formData, "student_first_name");
    const studentLastName = readRequiredString(formData, "student_last_name");
    const studentEmail = normalizeEmail(
      readRequiredString(formData, "student_email"),
    );
    const classLabel = readRequiredString(formData, "class_label");
    const certificateType = readCertificateType(formData);
    const studentNotes = readOptionalString(formData, "student_notes");
    const hoursRequested = readPositiveInteger(formData, "hours_requested");
    const schoolMode = readSubmissionMode(formData, "school_submission_mode");
    const serviceMode = readSubmissionMode(formData, "service_submission_mode");

    validateLength("nome", studentFirstName, 120);
    validateLength("cognome", studentLastName, 120);
    validateLength("email", studentEmail, 320);
    validateLength("classe", classLabel, 80);

    if (studentNotes) {
      validateLength("note", studentNotes, 2000);
    }

    if (!validateEmail(studentEmail)) {
      throw new Error("Inserisci un indirizzo email valido.");
    }

    if (certificateType === "pcto" && !hoursRequested) {
      throw new Error(
        "Per una richiesta PCTO devi indicare il numero di ore richieste.",
      );
    }

    const submissionIpHash = await getSubmissionIpHash();

    await ensureRecentSubmissionLimit(supabase, submissionIpHash);

    const { data: activeYear, error: activeYearError } = await supabase
      .from("school_years")
      .select("id, label")
      .eq("is_active", true)
      .maybeSingle();

    if (activeYearError) {
      throw activeYearError;
    }

    if (!activeYear) {
      throw new Error("Non e' presente un anno scolastico attivo.");
    }

    const manualSchool =
      schoolMode === "manual" ? readManualSchoolInput(formData) : null;
    const manualService =
      serviceMode === "manual" ? readManualServiceInput(formData) : null;

    let school:
      | {
          id: string;
          full_name: string;
          school_email: string | null;
          teacher_name: string | null;
          teacher_email: string | null;
          send_certificate_to_school_by_default: boolean;
          send_certificate_to_teacher_by_default: boolean;
        }
      | null = null;
    let service:
      | {
          id: string;
          name: string;
          weekday: string;
          schedule_label: string;
          address: string;
          city: string;
        }
      | null = null;
    let assignments:
      | {
          coordinator_id: string;
          receives_new_request_notifications: boolean;
        }[]
      | null = null;

    if (schoolMode === "existing") {
      const schoolId = readRequiredString(formData, "school_id");
      const { data: selectedSchool, error: schoolError } = await supabase
        .from("schools")
        .select(
          "id, full_name, school_email, teacher_name, teacher_email, send_certificate_to_school_by_default, send_certificate_to_teacher_by_default",
        )
        .eq("id", schoolId)
        .eq("is_active", true)
        .single();

      if (schoolError || !selectedSchool) {
        throw new Error("La scuola selezionata non e' disponibile.");
      }

      school = selectedSchool;
    }

    if (serviceMode === "existing") {
      const serviceId = readRequiredString(formData, "service_id");
      const [{ data: selectedService, error: serviceError }, { data: selectedAssignments, error: assignmentsError }] =
        await Promise.all([
          supabase
            .from("services")
            .select("id, name, weekday, schedule_label, address, city")
            .eq("id", serviceId)
            .eq("is_active", true)
            .single(),
          supabase
            .from("service_coordinators")
            .select("coordinator_id, receives_new_request_notifications")
            .eq("service_id", serviceId),
        ]);

      if (serviceError || !selectedService) {
        throw new Error("Il servizio selezionato non e' disponibile.");
      }

      if (assignmentsError) {
        throw assignmentsError;
      }

      service = selectedService;
      assignments = selectedAssignments ?? [];
    }

    const now = new Date().toISOString();
    const sendToSchool =
      schoolMode === "existing"
        ? Boolean(
            school?.send_certificate_to_school_by_default && school.school_email,
          )
        : false;
    const sendToTeacher =
      schoolMode === "existing"
        ? Boolean(
            school?.send_certificate_to_teacher_by_default &&
              school.teacher_email,
          )
        : false;

    let fallbackRecipients: NotificationRecipient[] = [];
    let deliveryRecipientType: "coordinator" | "admin" = "coordinator";
    let notificationTemplateKey = "new_request_coordinator";
    let notificationEventType = "coordinator_notifications_queued";

    if (serviceMode === "existing") {
      const activeCoordinatorIds = (assignments ?? []).map(
        (assignment) => assignment.coordinator_id,
      );

      if (activeCoordinatorIds.length === 0) {
        throw new Error(
          "Il servizio selezionato non ha ancora coordinatori assegnati. Contatta l'associazione prima di inviare la richiesta.",
        );
      }

      const { data: coordinators, error: coordinatorsError } = await supabase
        .from("coordinators")
        .select("id, first_name, last_name, email")
        .in("id", activeCoordinatorIds)
        .eq("is_active", true);

      if (coordinatorsError) {
        throw coordinatorsError;
      }

      if ((coordinators?.length ?? 0) === 0) {
        throw new Error(
          "Il servizio selezionato non ha coordinatori attivi disponibili al momento.",
        );
      }

      const coordinatorsById = new Map(
        (coordinators ?? []).map((coordinator) => [coordinator.id, coordinator]),
      );
      const notificationRecipients = (assignments ?? [])
        .filter(
          (assignment) =>
            assignment.receives_new_request_notifications &&
            coordinatorsById.has(assignment.coordinator_id),
        )
        .map((assignment) => coordinatorsById.get(assignment.coordinator_id))
        .filter(isNotificationRecipient);

      fallbackRecipients =
        notificationRecipients.length > 0
          ? notificationRecipients
          : (assignments ?? [])
              .map((assignment) => coordinatorsById.get(assignment.coordinator_id))
              .filter(isNotificationRecipient);

      if (!service) {
        throw new Error("Il servizio selezionato non e' disponibile.");
      }

      const duplicateRequest = await findExistingDuplicateRequest(supabase, {
        schoolYearId: activeYear.id,
        serviceMode: "existing",
        serviceId: service.id,
        certificateType,
        studentEmail,
      });

      if (duplicateRequest) {
        throw new Error(
          "Esiste gia' una richiesta aperta per questa email, servizio e tipo di certificato nell'anno scolastico corrente.",
        );
      }
    } else {
      fallbackRecipients = await loadAdminNotificationRecipients(supabase);
      deliveryRecipientType = "admin";
      notificationTemplateKey = "new_request_admin_missing_service";
      notificationEventType = "admin_notifications_queued";

      const duplicateRequest = await findExistingDuplicateRequest(supabase, {
        schoolYearId: activeYear.id,
        serviceMode: "manual",
        serviceNameSnapshot: manualService?.serviceType ?? "",
        serviceAddressSnapshot: manualService?.district ?? "",
        certificateType,
        studentEmail,
      });

      if (duplicateRequest) {
        throw new Error(
          "Esiste gia' una richiesta aperta per questa email, tipo di servizio e quartiere nell'anno scolastico corrente.",
        );
      }
    }

    if (fallbackRecipients.length === 0) {
      throw new Error(
        serviceMode === "existing"
          ? "Il servizio selezionato non ha coordinatori notificabili disponibili al momento."
          : "Non risultano admin notificabili per le richieste con servizio non presente in elenco.",
      );
    }

    const { data: insertedRequest, error: insertError } = await supabase
      .from("certificate_requests")
      .insert({
        school_year_id: activeYear.id,
        school_id: school?.id ?? null,
        service_id: service?.id ?? null,
        certificate_type: certificateType,
        student_first_name: studentFirstName,
        student_last_name: studentLastName,
        student_email: studentEmail,
        class_label: classLabel,
        hours_requested: hoursRequested,
        student_notes: studentNotes,
        school_name_snapshot: school?.full_name ?? manualSchool?.name ?? "",
        teacher_name_snapshot: school?.teacher_name ?? manualSchool?.teacherName ?? null,
        teacher_email_snapshot: school?.teacher_email ?? null,
        service_name_snapshot: service?.name ?? manualService?.serviceType ?? "",
        service_schedule_snapshot: service
          ? buildServiceScheduleSnapshot(service)
          : "Servizio non presente in elenco",
        service_address_snapshot: service
          ? buildServiceAddressSnapshot(service)
          : (manualService?.district ?? ""),
        send_to_school: sendToSchool,
        send_to_teacher: sendToTeacher,
        submission_ip_hash: submissionIpHash,
      })
      .select("id")
      .single();

    if (insertError) {
      if (
        typeof insertError === "object" &&
        insertError !== null &&
        "code" in insertError &&
        insertError.code === "23505"
      ) {
        throw new Error(
          "Esiste gia' una richiesta aperta per questa email, servizio e tipo di certificato nell'anno scolastico corrente.",
        );
      }

      throw insertError;
    }

    if (!insertedRequest) {
      throw new Error("Impossibile creare la richiesta.");
    }

    try {
      const { error: eventError } = await supabase.from("request_events").insert({
        request_id: insertedRequest.id,
        actor_type: "system",
        event_type: "request_submitted",
        payload: {
          source: "public_form",
          certificate_type: certificateType,
          school_id: school?.id ?? null,
          service_id: service?.id ?? null,
          school_year_label: activeYear.label,
          send_to_school: sendToSchool,
          send_to_teacher: sendToTeacher,
          school_submission_mode: schoolMode,
          service_submission_mode: serviceMode,
          routing_target: serviceMode === "existing" ? "coordinator" : "admin",
          manual_school:
            schoolMode === "manual"
              ? {
                  name: manualSchool?.name ?? null,
                  address: manualSchool?.address ?? null,
                  teacher_name: manualSchool?.teacherName ?? null,
                }
              : null,
          manual_service:
            serviceMode === "manual"
              ? {
                  service_type: manualService?.serviceType ?? null,
                  district: manualService?.district ?? null,
                  manager_name: manualService?.managerName ?? null,
                }
              : null,
        },
      });

      if (eventError) {
        throw eventError;
      }

      const { error: deliveriesError } = await supabase
        .from("email_deliveries")
        .insert(
          fallbackRecipients.map((coordinator) => ({
            request_id: insertedRequest.id,
            recipient_type: deliveryRecipientType,
            recipient_email: coordinator.email,
            template_key: notificationTemplateKey,
          })),
        );

      if (deliveriesError) {
        throw deliveriesError;
      }

      const { error: queuedEventError } = await supabase
        .from("request_events")
        .insert({
          request_id: insertedRequest.id,
          actor_type: "system",
          event_type: notificationEventType,
          payload: {
            recipient_count: fallbackRecipients.length,
            recipients: fallbackRecipients.map((coordinator) => ({
              coordinator_id: coordinator.id,
              email: coordinator.email,
              full_name: `${coordinator.first_name} ${coordinator.last_name}`,
            })),
            queued_at: now,
          },
        });

      if (queuedEventError) {
        throw queuedEventError;
      }
    } catch (error) {
      await supabase
        .from("certificate_requests")
        .delete()
        .eq("id", insertedRequest.id);

      throw error;
    }

    redirect(REQUEST_CONFIRMATION_PATH);
  } catch (error) {
    if (isNextRedirectError(error)) {
      throw error;
    }

    if (error instanceof Error && error.message.trim() !== "") {
      redirectToForm("error", error.message);
    }

    console.error("submitCertificateRequestAction failed", error);
    redirectToForm(
      "error",
      "Impossibile inviare la richiesta in questo momento. Riprova tra poco.",
    );
  }
}
