"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertCoordinator } from "@/lib/auth/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import type { TablesUpdate } from "@/lib/supabase/database.types";
import {
  buildCoordinatorRequestPath,
  getRequestStatusLabel,
  isEditableRequestStatus,
} from "@/lib/coordinator/requests";
import {
  readBoolean,
  readOptionalString,
  readRedirectPath,
  readRequiredString,
} from "@/lib/utils/form-data";

const DASHBOARD_PATH = "/coordinatore";

type AccessibleRequest = {
  id: string;
  updated_at: string;
  status: "submitted" | "approved" | "rejected" | "completed" | "delivery_failed" | "cancelled";
  school_id: string | null;
  school_year_id: string;
  service_id: string | null;
};

type EditableRequestValues = {
  studentFirstName: string;
  studentLastName: string;
  studentEmail: string;
  classLabel: string;
  certificateType: "pcto" | "volontariato";
  hoursRequested: number | null;
  hoursApproved: number | null;
  studentNotes: string | null;
  schoolNameSnapshot: string;
  teacherNameSnapshot: string | null;
  teacherEmailSnapshot: string | null;
  serviceNameSnapshot: string;
  serviceScheduleSnapshot: string;
  serviceAddressSnapshot: string;
  sendToSchool: boolean;
  sendToTeacher: boolean;
  decisionNotes: string | null;
  rejectionReason: string | null;
};

function redirectWithMessage(
  path: string,
  type: "error" | "success",
  message: string,
) {
  redirect(`${path}?${type}=${encodeURIComponent(message)}`);
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

function handleActionError(error: unknown, fallbackMessage: string) {
  if (isNextRedirectError(error)) {
    throw error;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  ) {
    return "Esiste gia' un'altra richiesta aperta con la stessa email, servizio e tipo di certificato.";
  }

  if (error instanceof Error && error.message.trim() !== "") {
    return error.message;
  }

  return fallbackMessage;
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

function readOptionalPositiveInteger(
  formData: FormData,
  key: string,
  label: string,
) {
  const value = readOptionalString(formData, key);

  if (!value) {
    return null;
  }

  if (!/^\d+$/.test(value)) {
    throw new Error(`Il campo ${label} deve contenere un numero intero positivo.`);
  }

  const parsed = Number.parseInt(value, 10);

  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`Il campo ${label} deve contenere un numero intero positivo.`);
  }

  return parsed;
}

function readEditableRequestValues(formData: FormData): EditableRequestValues {
  const studentFirstName = readRequiredString(formData, "student_first_name");
  const studentLastName = readRequiredString(formData, "student_last_name");
  const studentEmail = normalizeEmail(
    readRequiredString(formData, "student_email"),
  );
  const classLabel = readRequiredString(formData, "class_label");
  const certificateType = readCertificateType(formData);
  const hoursRequested = readOptionalPositiveInteger(
    formData,
    "hours_requested",
    "ore richieste",
  );
  const hoursApproved = readOptionalPositiveInteger(
    formData,
    "hours_approved",
    "ore approvate",
  );
  const studentNotes = readOptionalString(formData, "student_notes");
  const schoolNameSnapshot = readRequiredString(formData, "school_name_snapshot");
  const teacherNameSnapshot = readOptionalString(formData, "teacher_name_snapshot");
  const teacherEmailSnapshot = normalizeOptionalEmail(
    readOptionalString(formData, "teacher_email_snapshot"),
  );
  const serviceNameSnapshot = readRequiredString(
    formData,
    "service_name_snapshot",
  );
  const serviceScheduleSnapshot = readRequiredString(
    formData,
    "service_schedule_snapshot",
  );
  const serviceAddressSnapshot = readRequiredString(
    formData,
    "service_address_snapshot",
  );
  const sendToSchool = readBoolean(formData, "send_to_school");
  const sendToTeacher = readBoolean(formData, "send_to_teacher");
  const decisionNotes = readOptionalString(formData, "decision_notes");
  const rejectionReason = readOptionalString(formData, "rejection_reason");

  validateLength("nome", studentFirstName, 120);
  validateLength("cognome", studentLastName, 120);
  validateLength("email studente", studentEmail, 320);
  validateLength("classe", classLabel, 80);
  validateLength("scuola", schoolNameSnapshot, 200);
  validateLength("servizio", serviceNameSnapshot, 200);
  validateLength("orario del servizio", serviceScheduleSnapshot, 200);
  validateLength("indirizzo del servizio", serviceAddressSnapshot, 240);

  if (!validateEmail(studentEmail)) {
    throw new Error("Inserisci un indirizzo email studente valido.");
  }

  if (teacherNameSnapshot) {
    validateLength("nome docente", teacherNameSnapshot, 160);
  }

  if (teacherEmailSnapshot && !validateEmail(teacherEmailSnapshot)) {
    throw new Error("Inserisci un indirizzo email docente valido.");
  }

  if (studentNotes) {
    validateLength("note studente", studentNotes, 2000);
  }

  if (decisionNotes) {
    validateLength("note del coordinatore", decisionNotes, 2000);
  }

  if (rejectionReason) {
    validateLength("motivo del rifiuto", rejectionReason, 2000);
  }

  if (certificateType === "pcto" && !hoursRequested) {
    throw new Error(
      "Per una richiesta PCTO devi indicare il numero di ore richieste.",
    );
  }

  return {
    studentFirstName,
    studentLastName,
    studentEmail,
    classLabel,
    certificateType,
    hoursRequested,
    hoursApproved,
    studentNotes,
    schoolNameSnapshot,
    teacherNameSnapshot,
    teacherEmailSnapshot,
    serviceNameSnapshot,
    serviceScheduleSnapshot,
    serviceAddressSnapshot,
    sendToSchool,
    sendToTeacher,
    decisionNotes,
    rejectionReason,
  };
}

function normalizeOptionalEmail(email: string | null) {
  return email ? normalizeEmail(email) : null;
}

function buildBaseUpdatePayload(
  values: EditableRequestValues,
  options: {
    schoolEmail: string | null;
  },
): TablesUpdate<"certificate_requests"> {
  if (values.sendToSchool && !options.schoolEmail) {
    throw new Error(
      "Per questa richiesta non e' disponibile un'email scuola a cui inviare la copia.",
    );
  }

  if (values.sendToTeacher && !values.teacherEmailSnapshot) {
    throw new Error(
      "Per inviare la copia al docente devi indicare un'email docente valida.",
    );
  }

  return {
    student_first_name: values.studentFirstName,
    student_last_name: values.studentLastName,
    student_email: values.studentEmail,
    class_label: values.classLabel,
    certificate_type: values.certificateType,
    hours_requested: values.hoursRequested,
    hours_approved: values.hoursApproved,
    student_notes: values.studentNotes,
    school_name_snapshot: values.schoolNameSnapshot,
    teacher_name_snapshot: values.teacherNameSnapshot,
    teacher_email_snapshot: values.teacherEmailSnapshot,
    service_name_snapshot: values.serviceNameSnapshot,
    service_schedule_snapshot: values.serviceScheduleSnapshot,
    service_address_snapshot: values.serviceAddressSnapshot,
    send_to_school: values.sendToSchool,
    send_to_teacher: values.sendToTeacher,
    decision_notes: values.decisionNotes,
  };
}

async function loadAccessibleRequest(requestId: string) {
  const { supabase } = await assertCoordinator();
  const { data, error } = await supabase
    .from("certificate_requests")
    .select("id, updated_at, status, school_id, school_year_id, service_id")
    .eq("id", requestId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("Richiesta non trovata o non accessibile a questo coordinatore.");
  }

  return data as AccessibleRequest;
}

async function loadSchoolEmail(schoolId: string | null) {
  if (!schoolId) {
    return null;
  }

  const adminSupabase = createAdminClient();
  const { data, error } = await adminSupabase
    .from("schools")
    .select("school_email")
    .eq("id", schoolId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.school_email ?? null;
}

async function recordRequestEvent(params: {
  requestId: string;
  actorUserId: string;
  coordinatorId: string;
  eventType: string;
  payload: Record<string, unknown>;
}) {
  try {
    const adminSupabase = createAdminClient();
    const { error } = await adminSupabase.from("request_events").insert({
      request_id: params.requestId,
      actor_type: "coordinator",
      actor_user_id: params.actorUserId,
      event_type: params.eventType,
      payload: {
        coordinator_id: params.coordinatorId,
        ...params.payload,
      },
    });

    if (error) {
      console.error("recordRequestEvent failed", error);
    }
  } catch (error) {
    console.error("recordRequestEvent unexpected failure", error);
  }
}

function ensureEditableRequest(currentRequest: AccessibleRequest) {
  if (!isEditableRequestStatus(currentRequest.status)) {
    throw new Error(
      `La richiesta non e' piu' modificabile: stato attuale ${getRequestStatusLabel(
        currentRequest.status,
      ).toLowerCase()}.`,
    );
  }
}

function getRequestPathFromForm(formData: FormData) {
  const requestId = readOptionalString(formData, "id");

  return requestId ? buildCoordinatorRequestPath(requestId) : DASHBOARD_PATH;
}

export async function saveCoordinatorRequestAction(formData: FormData) {
  const redirectTo = readRedirectPath(formData, getRequestPathFromForm(formData));

  try {
    const { coordinator, user } = await assertCoordinator();

    if (!coordinator) {
      throw new Error("Coordinatore non disponibile.");
    }

    const requestId = readRequiredString(formData, "id");
    const expectedUpdatedAt = readRequiredString(formData, "current_updated_at");
    const currentRequest = await loadAccessibleRequest(requestId);

    ensureEditableRequest(currentRequest);

    if (currentRequest.updated_at !== expectedUpdatedAt) {
      throw new Error(
        "La richiesta e' stata aggiornata da un'altra sessione. Ricarica la pagina prima di salvare di nuovo.",
      );
    }

    const values = readEditableRequestValues(formData);
    const schoolEmail = await loadSchoolEmail(currentRequest.school_id);
    const payload = buildBaseUpdatePayload(values, { schoolEmail });
    const adminSupabase = createAdminClient();
    const { data: updatedRequest, error } = await adminSupabase
      .from("certificate_requests")
      .update(payload)
      .eq("id", requestId)
      .eq("status", "submitted")
      .eq("updated_at", expectedUpdatedAt)
      .select("id, updated_at")
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!updatedRequest) {
      throw new Error(
        "La richiesta non e' stata salvata perche' e' cambiata nel frattempo. Ricarica la pagina e riprova.",
      );
    }

    await recordRequestEvent({
      requestId,
      actorUserId: user.id,
      coordinatorId: coordinator.id,
      eventType: "request_updated_by_coordinator",
      payload: {
        status: "submitted",
        updated_at: updatedRequest.updated_at,
      },
    });

    revalidatePath(DASHBOARD_PATH);
    revalidatePath(buildCoordinatorRequestPath(requestId));
    redirectWithMessage(
      buildCoordinatorRequestPath(requestId),
      "success",
      "Richiesta aggiornata.",
    );
  } catch (error) {
    redirectWithMessage(
      redirectTo,
      "error",
      handleActionError(error, "Impossibile aggiornare la richiesta."),
    );
  }
}

export async function approveCoordinatorRequestAction(formData: FormData) {
  const redirectTo = readRedirectPath(formData, getRequestPathFromForm(formData));

  try {
    const { coordinator, user } = await assertCoordinator();

    if (!coordinator) {
      throw new Error("Coordinatore non disponibile.");
    }

    const requestId = readRequiredString(formData, "id");
    const expectedUpdatedAt = readRequiredString(formData, "current_updated_at");
    const currentRequest = await loadAccessibleRequest(requestId);

    ensureEditableRequest(currentRequest);

    if (currentRequest.updated_at !== expectedUpdatedAt) {
      throw new Error(
        "La richiesta e' stata aggiornata da un'altra sessione. Ricarica la pagina prima di approvare.",
      );
    }

    const values = readEditableRequestValues(formData);
    const schoolEmail = await loadSchoolEmail(currentRequest.school_id);
    const now = new Date().toISOString();
    const hoursApproved = values.hoursApproved ?? values.hoursRequested;

    if (values.certificateType === "pcto" && !hoursApproved) {
      throw new Error(
        "Per approvare una richiesta PCTO devi indicare almeno le ore richieste o le ore approvate.",
      );
    }

    const payload: TablesUpdate<"certificate_requests"> = {
      ...buildBaseUpdatePayload(
        {
          ...values,
          hoursApproved,
        },
        { schoolEmail },
      ),
      status: "approved",
      reviewed_at: now,
      reviewed_by_coordinator_id: coordinator.id,
      approved_at: now,
      rejected_at: null,
      rejection_reason: null,
    };

    const adminSupabase = createAdminClient();
    const { data: updatedRequest, error } = await adminSupabase
      .from("certificate_requests")
      .update(payload)
      .eq("id", requestId)
      .eq("status", "submitted")
      .eq("updated_at", expectedUpdatedAt)
      .select("id, updated_at")
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!updatedRequest) {
      throw new Error(
        "La richiesta non e' stata approvata perche' e' cambiata nel frattempo. Ricarica la pagina e riprova.",
      );
    }

    await recordRequestEvent({
      requestId,
      actorUserId: user.id,
      coordinatorId: coordinator.id,
      eventType: "request_approved",
      payload: {
        approved_at: now,
        send_to_school: payload.send_to_school,
        send_to_teacher: payload.send_to_teacher,
        hours_approved: payload.hours_approved,
      },
    });

    revalidatePath(DASHBOARD_PATH);
    revalidatePath(buildCoordinatorRequestPath(requestId));
    redirectWithMessage(
      buildCoordinatorRequestPath(requestId),
      "success",
      "Richiesta approvata.",
    );
  } catch (error) {
    redirectWithMessage(
      redirectTo,
      "error",
      handleActionError(error, "Impossibile approvare la richiesta."),
    );
  }
}

export async function rejectCoordinatorRequestAction(formData: FormData) {
  const redirectTo = readRedirectPath(formData, getRequestPathFromForm(formData));

  try {
    const { coordinator, user } = await assertCoordinator();

    if (!coordinator) {
      throw new Error("Coordinatore non disponibile.");
    }

    const requestId = readRequiredString(formData, "id");
    const expectedUpdatedAt = readRequiredString(formData, "current_updated_at");
    const currentRequest = await loadAccessibleRequest(requestId);

    ensureEditableRequest(currentRequest);

    if (currentRequest.updated_at !== expectedUpdatedAt) {
      throw new Error(
        "La richiesta e' stata aggiornata da un'altra sessione. Ricarica la pagina prima di rifiutare.",
      );
    }

    const values = readEditableRequestValues(formData);

    if (!values.rejectionReason) {
      throw new Error("Per rifiutare la richiesta devi inserire una motivazione.");
    }

    const now = new Date().toISOString();
    const adminSupabase = createAdminClient();
    const { data: updatedRequest, error } = await adminSupabase
      .from("certificate_requests")
      .update({
        student_first_name: values.studentFirstName,
        student_last_name: values.studentLastName,
        student_email: values.studentEmail,
        class_label: values.classLabel,
        certificate_type: values.certificateType,
        hours_requested: values.hoursRequested,
        hours_approved: null,
        student_notes: values.studentNotes,
        school_name_snapshot: values.schoolNameSnapshot,
        teacher_name_snapshot: values.teacherNameSnapshot,
        teacher_email_snapshot: values.teacherEmailSnapshot,
        service_name_snapshot: values.serviceNameSnapshot,
        service_schedule_snapshot: values.serviceScheduleSnapshot,
        service_address_snapshot: values.serviceAddressSnapshot,
        send_to_school: false,
        send_to_teacher: false,
        decision_notes: values.decisionNotes,
        rejection_reason: values.rejectionReason,
        status: "rejected",
        reviewed_at: now,
        reviewed_by_coordinator_id: coordinator.id,
        approved_at: null,
        rejected_at: now,
      })
      .eq("id", requestId)
      .eq("status", "submitted")
      .eq("updated_at", expectedUpdatedAt)
      .select("id, updated_at")
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!updatedRequest) {
      throw new Error(
        "La richiesta non e' stata rifiutata perche' e' cambiata nel frattempo. Ricarica la pagina e riprova.",
      );
    }

    await recordRequestEvent({
      requestId,
      actorUserId: user.id,
      coordinatorId: coordinator.id,
      eventType: "request_rejected",
      payload: {
        rejected_at: now,
        rejection_reason: values.rejectionReason,
      },
    });

    revalidatePath(DASHBOARD_PATH);
    revalidatePath(buildCoordinatorRequestPath(requestId));
    redirectWithMessage(
      buildCoordinatorRequestPath(requestId),
      "success",
      "Richiesta rifiutata.",
    );
  } catch (error) {
    redirectWithMessage(
      redirectTo,
      "error",
      handleActionError(error, "Impossibile rifiutare la richiesta."),
    );
  }
}
