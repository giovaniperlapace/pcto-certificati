"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertCoordinator } from "@/lib/auth/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Tables, TablesUpdate } from "@/lib/supabase/database.types";
import {
  readBoolean,
  readOptionalString,
  readRedirectPath,
  readRequiredString,
} from "@/lib/utils/form-data";

const PCTO_COORDINATOR_PATH = "/coordinatore/pcto";
const ACTIVE_DUPLICATE_STATUSES = [
  "submitted",
  "approved",
  "completed",
  "delivery_failed",
] as const;

type PctoStudentRegistration = Tables<"pcto_student_registrations">;

type AssignedService = {
  address: string;
  city: string;
  id: string;
  name: string;
  schedule_label: string;
  weekday: string;
};

type School = Pick<
  Tables<"schools">,
  | "full_name"
  | "id"
  | "school_email"
  | "send_certificate_to_school_by_default"
  | "send_certificate_to_teacher_by_default"
  | "short_name"
  | "teacher_email"
  | "teacher_name"
>;

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

  if (error instanceof Error && error.message.trim() !== "") {
    return error.message;
  }

  return fallbackMessage;
}

function readOptionalInteger(formData: FormData, key: string) {
  const value = readOptionalString(formData, key);

  if (value === null) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed)) {
    throw new Error(`Il campo ${key} deve essere un numero intero.`);
  }

  return parsed;
}

function readCertificateType(formData: FormData) {
  const value = readRequiredString(formData, "certificate_type");

  if (value !== "pcto" && value !== "volontariato") {
    throw new Error("Tipo certificato non valido.");
  }

  return value;
}

function normalizeText(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function normalizeEmail(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function validateEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function buildClassLabel(student: PctoStudentRegistration) {
  return [student.class_year, student.class_section]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(" ");
}

function buildServiceScheduleSnapshot(service: AssignedService) {
  return `${service.weekday} - ${service.schedule_label}`;
}

function buildServiceAddressSnapshot(service: AssignedService) {
  return [service.address, service.city].filter(Boolean).join(", ");
}

function getAssignedService(assignment: {
  services: AssignedService | AssignedService[] | null;
}) {
  return Array.isArray(assignment.services)
    ? assignment.services[0]
    : assignment.services;
}

async function getCoordinatorServiceNames(coordinatorId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("service_coordinators")
    .select("services(name)")
    .eq("coordinator_id", coordinatorId);

  if (error) {
    throw error;
  }

  return (data ?? [])
    .map((assignment) => {
      const service = Array.isArray(assignment.services)
        ? assignment.services[0]
        : assignment.services;

      return service?.name ?? null;
    })
    .filter((name): name is string => Boolean(name))
    .sort((left, right) => left.localeCompare(right, "it"));
}

async function getCoordinatorAssignedServices(coordinatorId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("service_coordinators")
    .select("services(id, name, weekday, schedule_label, address, city)")
    .eq("coordinator_id", coordinatorId);

  if (error) {
    throw error;
  }

  return (data ?? [])
    .map((assignment) => getAssignedService(assignment))
    .filter((service): service is AssignedService => Boolean(service));
}

async function findSchoolByImportedName(schoolName: string | null) {
  if (!schoolName) {
    return null;
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("schools")
    .select(
      "id, short_name, full_name, school_email, teacher_name, teacher_email, send_certificate_to_school_by_default, send_certificate_to_teacher_by_default",
    )
    .eq("is_active", true);

  if (error) {
    throw error;
  }

  const normalizedSchoolName = normalizeText(schoolName);

  return (
    (data ?? []).find(
      (school) =>
        normalizeText(school.short_name) === normalizedSchoolName ||
        normalizeText(school.full_name) === normalizedSchoolName,
    ) ?? null
  ) satisfies School | null;
}

async function findActiveDuplicateRequest(params: {
  certificateType: "pcto";
  schoolYearId: string;
  serviceId: string;
  studentEmail: string;
}) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("certificate_requests")
    .select("id, student_email")
    .eq("school_year_id", params.schoolYearId)
    .eq("certificate_type", params.certificateType)
    .eq("service_id", params.serviceId)
    .in("status", [...ACTIVE_DUPLICATE_STATUSES]);

  if (error) {
    throw error;
  }

  return (
    (data ?? []).find(
      (request) => normalizeEmail(request.student_email) === params.studentEmail,
    ) ?? null
  );
}

export async function updatePctoStudentRegistrationAction(formData: FormData) {
  const redirectTo = readRedirectPath(formData, PCTO_COORDINATOR_PATH);

  try {
    const { coordinator } = await assertCoordinator();

    if (!coordinator) {
      throw new Error("Coordinatore non disponibile.");
    }

    const id = readRequiredString(formData, "id");
    const assignedServiceName = readRequiredString(
      formData,
      "assigned_service_name",
    );
    const assignedServiceNames = await getCoordinatorServiceNames(coordinator.id);

    if (!assignedServiceNames.includes(assignedServiceName)) {
      throw new Error(
        "Il servizio selezionato non e' collegato a questo coordinatore.",
      );
    }

    const supabase = createAdminClient();
    const { data: currentStudent, error: currentStudentError } = await supabase
      .from("pcto_student_registrations")
      .select("id, assigned_service_name")
      .eq("id", id)
      .maybeSingle();

    if (currentStudentError) {
      throw currentStudentError;
    }

    if (!currentStudent) {
      throw new Error("Studente PCTO non trovato.");
    }

    if (
      !currentStudent.assigned_service_name ||
      !assignedServiceNames.includes(currentStudent.assigned_service_name)
    ) {
      throw new Error("Studente PCTO non accessibile a questo coordinatore.");
    }

    const values = {
      assigned_service_name: assignedServiceName,
      certificate_type: readCertificateType(formData),
      class_section: readOptionalString(formData, "class_section"),
      class_year: readOptionalString(formData, "class_year"),
      display_name: readOptionalString(formData, "display_name"),
      duplicate_code: readOptionalString(formData, "duplicate_code"),
      duplicate_marker: readOptionalString(formData, "duplicate_marker"),
      friend_preferences: readOptionalString(formData, "friend_preferences"),
      internal_notes: readOptionalString(formData, "internal_notes"),
      invitation_sent: readBoolean(formData, "invitation_sent"),
      registry_confirmed: readBoolean(formData, "registry_confirmed"),
      registration_status: readOptionalString(formData, "registration_status"),
      student_address: readOptionalString(formData, "student_address"),
      student_email: readOptionalString(formData, "student_email"),
      student_notes: readOptionalString(formData, "student_notes"),
      student_phone: readOptionalString(formData, "student_phone"),
      teacher_name: readOptionalString(formData, "teacher_name"),
      unavailable_days: readOptionalString(formData, "unavailable_days"),
      waiting_list_position: readOptionalInteger(
        formData,
        "waiting_list_position",
      ),
    } satisfies TablesUpdate<"pcto_student_registrations">;

    const { error: updateError } = await supabase
      .from("pcto_student_registrations")
      .update(values)
      .eq("id", id);

    if (updateError) {
      throw updateError;
    }

    revalidatePath(PCTO_COORDINATOR_PATH);
    redirectWithMessage(redirectTo, "success", "Scheda studente aggiornata.");
  } catch (error) {
    const message = handleActionError(
      error,
      "Impossibile aggiornare la scheda studente.",
    );

    redirectWithMessage(redirectTo, "error", message);
  }
}

export async function createCertificateRequestFromPctoStudentAction(
  formData: FormData,
) {
  const redirectTo = readRedirectPath(formData, PCTO_COORDINATOR_PATH);

  try {
    const { coordinator, user } = await assertCoordinator();

    if (!coordinator || !user) {
      throw new Error("Coordinatore non disponibile.");
    }

    const studentRegistrationId = readRequiredString(formData, "id");
    const supabase = createAdminClient();
    const { data: student, error: studentError } = await supabase
      .from("pcto_student_registrations")
      .select("*")
      .eq("id", studentRegistrationId)
      .maybeSingle();

    if (studentError) {
      throw studentError;
    }

    if (!student) {
      throw new Error("Studente PCTO non trovato.");
    }

    if (normalizeText(student.registration_status) === "concluso") {
      throw new Error("Lo studente risulta gia' concluso.");
    }

    const assignedServices = await getCoordinatorAssignedServices(coordinator.id);
    const service = assignedServices.find(
      (candidate) =>
        normalizeText(candidate.name) ===
        normalizeText(student.assigned_service_name),
    );

    if (!service) {
      throw new Error(
        "Lo studente non e' assegnato a un servizio collegato a questo coordinatore.",
      );
    }

    const attendanceCount = student.attendance_count ?? 0;

    const studentEmail = normalizeEmail(student.student_email);

    if (!studentEmail || !validateEmail(studentEmail)) {
      throw new Error(
        "Per creare la richiesta serve un'email studente valida nella scheda PCTO.",
      );
    }

    if (!student.school_name?.trim()) {
      throw new Error(
        "Per creare la richiesta serve il nome della scuola nella scheda PCTO.",
      );
    }

    const classLabel = buildClassLabel(student) || "Non indicata";
    const hoursRequested = attendanceCount > 0 ? attendanceCount * 4 : 20;
    const school = await findSchoolByImportedName(student.school_name);
    const duplicateRequest = await findActiveDuplicateRequest({
      certificateType: "pcto",
      schoolYearId: student.school_year_id,
      serviceId: service.id,
      studentEmail,
    });

    if (duplicateRequest) {
      throw new Error(
        "Esiste gia' una richiesta aperta per questo studente, servizio e tipo di certificato.",
      );
    }

    const sendToSchool = Boolean(
      school?.send_certificate_to_school_by_default && school.school_email,
    );
    const sendToTeacher = Boolean(
      school?.send_certificate_to_teacher_by_default && school.teacher_email,
    );

    const { data: insertedRequest, error: insertError } = await supabase
      .from("certificate_requests")
      .insert({
        certificate_type: "pcto",
        class_label: classLabel,
        hours_requested: hoursRequested,
        school_id: school?.id ?? null,
        school_name_snapshot: school?.full_name ?? student.school_name,
        school_year_id: student.school_year_id,
        send_to_school: sendToSchool,
        send_to_teacher: sendToTeacher,
        service_address_snapshot: buildServiceAddressSnapshot(service),
        service_id: service.id,
        service_name_snapshot: service.name,
        service_schedule_snapshot: buildServiceScheduleSnapshot(service),
        student_email: studentEmail,
        student_first_name: student.student_first_name,
        student_last_name: student.student_last_name,
        student_notes: student.student_notes,
        teacher_email_snapshot: school?.teacher_email ?? null,
        teacher_name_snapshot: school?.teacher_name ?? student.teacher_name,
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
          "Esiste gia' una richiesta aperta per questo studente, servizio e tipo di certificato.",
        );
      }

      throw insertError;
    }

    if (!insertedRequest) {
      throw new Error("Impossibile creare la richiesta di certificato.");
    }

    const { error: eventError } = await supabase.from("request_events").insert({
      actor_type: "coordinator",
      actor_user_id: user.id,
      event_type: "request_submitted",
      payload: {
        attendance_count: attendanceCount,
        hours_requested: hoursRequested,
        pcto_student_registration_id: student.id,
        source: "pcto_import",
        source_code: student.source_code,
        source_row_number: student.source_row_number,
      },
      request_id: insertedRequest.id,
    });

    if (eventError) {
      await supabase
        .from("certificate_requests")
        .delete()
        .eq("id", insertedRequest.id);
      throw eventError;
    }

    const { error: updateStudentError } = await supabase
      .from("pcto_student_registrations")
      .update({
        internal_notes: [
          student.internal_notes,
          `Richiesta certificato creata il ${new Date().toISOString()} (${insertedRequest.id}).`,
        ]
          .filter(Boolean)
          .join("\n"),
        registration_status: "Concluso",
      })
      .eq("id", student.id);

    if (updateStudentError) {
      await supabase
        .from("certificate_requests")
        .delete()
        .eq("id", insertedRequest.id);
      throw updateStudentError;
    }

    revalidatePath(PCTO_COORDINATOR_PATH);
    revalidatePath("/coordinatore");
    redirect(
      `/coordinatore/richieste/${insertedRequest.id}?success=${encodeURIComponent(
        "Richiesta PCTO creata. Ora puoi revisionarla nel flusso ordinario.",
      )}`,
    );
  } catch (error) {
    const message = handleActionError(
      error,
      "Impossibile creare la richiesta di certificato.",
    );

    redirectWithMessage(redirectTo, "error", message);
  }
}
