import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildCertificateStoragePath,
  CERTIFICATE_STORAGE_BUCKET,
  type CertificateDeliveryRequest,
} from "@/lib/certificates/content";
import { sendCertificateEmail } from "@/lib/certificates/email";
import { buildCertificatePdf } from "@/lib/certificates/pdf";
import type { Json, TablesUpdate } from "@/lib/supabase/database.types";

type FinalDeliveryStatus = "completed" | "delivery_failed";
type CertificateRecipientType = "student" | "school" | "teacher";

type DeliveryAttemptResult = {
  errorMessage: string | null;
  recipientEmail: string;
  recipientType: CertificateRecipientType;
  sentAt: string | null;
  status: "sent" | "failed";
};

export type FinalizeRequestDeliveryResult = {
  deliveryResults: DeliveryAttemptResult[];
  errorMessage: string | null;
  finalStatus: FinalDeliveryStatus;
  pdfStoragePath: string | null;
};

function toErrorMessage(error: unknown, fallbackMessage: string) {
  if (error instanceof Error && error.message.trim() !== "") {
    return error.message;
  }

  return fallbackMessage;
}

function canFinalizeRequestStatus(status: string) {
  return status === "approved" || status === "delivery_failed";
}

async function ensureCertificateBucket() {
  const adminSupabase = createAdminClient();
  const { data: buckets, error: listError } = await adminSupabase.storage.listBuckets();

  if (listError) {
    throw listError;
  }

  if (
    buckets?.some(
      (bucket) =>
        bucket.id === CERTIFICATE_STORAGE_BUCKET ||
        bucket.name === CERTIFICATE_STORAGE_BUCKET,
    )
  ) {
    return;
  }

  const { error: createError } = await adminSupabase.storage.createBucket(
    CERTIFICATE_STORAGE_BUCKET,
    {
      public: false,
    },
  );

  if (createError && !createError.message.toLowerCase().includes("already exists")) {
    throw createError;
  }
}

async function uploadCertificatePdf(params: {
  pdfBytes: Uint8Array;
  request: CertificateDeliveryRequest;
}) {
  await ensureCertificateBucket();

  const adminSupabase = createAdminClient();
  const storagePath = buildCertificateStoragePath(params.request);
  const { error } = await adminSupabase.storage
    .from(CERTIFICATE_STORAGE_BUCKET)
    .upload(storagePath, params.pdfBytes, {
      upsert: true,
      contentType: "application/pdf",
    });

  if (error) {
    throw error;
  }

  return storagePath;
}

async function recordSystemEvent(params: {
  eventType: string;
  payload: Json;
  requestId: string;
}) {
  try {
    const adminSupabase = createAdminClient();
    const { error } = await adminSupabase.from("request_events").insert({
      request_id: params.requestId,
      actor_type: "system",
      event_type: params.eventType,
      payload: params.payload,
    });

    if (error) {
      console.error("recordSystemEvent failed", error);
    }
  } catch (error) {
    console.error("recordSystemEvent unexpected failure", error);
  }
}

async function loadRequestForDelivery(requestId: string) {
  const adminSupabase = createAdminClient();
  const { data: request, error: requestError } = await adminSupabase
    .from("certificate_requests")
    .select(
      "id, status, approved_at, student_first_name, student_last_name, student_email, class_label, certificate_type, certificate_heading_text, certificate_body_text, hours_requested, hours_approved, school_id, school_name_snapshot, service_name_snapshot, service_schedule_snapshot, service_address_snapshot, send_to_school, send_to_teacher, teacher_name_snapshot, teacher_email_snapshot, pdf_storage_path, pdf_generated_at, student_emailed_at, school_emailed_at, teacher_emailed_at, school_year_id",
    )
    .eq("id", requestId)
    .maybeSingle();

  if (requestError) {
    throw requestError;
  }

  if (!request) {
    throw new Error("Richiesta non trovata.");
  }

  const [{ data: schoolYear, error: schoolYearError }, { data: school, error: schoolError }] =
    await Promise.all([
      adminSupabase
        .from("school_years")
        .select("label")
        .eq("id", request.school_year_id)
        .maybeSingle(),
      request.school_id
        ? adminSupabase
            .from("schools")
            .select("school_email")
            .eq("id", request.school_id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);

  if (schoolYearError) {
    throw schoolYearError;
  }

  if (!schoolYear) {
    throw new Error("Anno scolastico della richiesta non trovato.");
  }

  if (schoolError) {
    throw schoolError;
  }

  return {
    ...request,
    schoolEmail: school?.school_email ?? null,
    schoolYearLabel: schoolYear.label,
  } satisfies CertificateDeliveryRequest & { status: string };
}

function buildPendingRecipients(request: CertificateDeliveryRequest) {
  const recipients: Array<{
    email: string;
    recipientType: CertificateRecipientType;
  }> = [];

  if (!request.student_emailed_at) {
    recipients.push({
      recipientType: "student",
      email: request.student_email,
    });
  }

  if (request.send_to_school && !request.school_emailed_at) {
    if (!request.schoolEmail) {
      throw new Error(
        "La richiesta prevede l'invio alla scuola ma non esiste un'email scuola disponibile.",
      );
    }

    recipients.push({
      recipientType: "school",
      email: request.schoolEmail,
    });
  }

  if (request.send_to_teacher && !request.teacher_emailed_at) {
    if (!request.teacher_email_snapshot) {
      throw new Error(
        "La richiesta prevede l'invio al docente ma non esiste un'email docente disponibile.",
      );
    }

    recipients.push({
      recipientType: "teacher",
      email: request.teacher_email_snapshot,
    });
  }

  return recipients;
}

async function sendEmailWithDeliveryLog(params: {
  pdfBytes: Uint8Array;
  recipientEmail: string;
  recipientType: CertificateRecipientType;
  request: CertificateDeliveryRequest;
}) {
  const adminSupabase = createAdminClient();
  const templateKey = `certificate_${params.recipientType}`;
  const { data: insertedDelivery, error: insertError } = await adminSupabase
    .from("email_deliveries")
    .insert({
      request_id: params.request.id,
      recipient_type: params.recipientType,
      recipient_email: params.recipientEmail,
      template_key: templateKey,
      status: "pending",
    })
    .select("id")
    .single();

  if (insertError) {
    throw insertError;
  }

  const lastAttemptAt = new Date().toISOString();

  try {
    const info = await sendCertificateEmail({
      request: params.request,
      recipientEmail: params.recipientEmail,
      recipientType: params.recipientType,
      pdfBytes: params.pdfBytes,
    });
    const sentAt = new Date().toISOString();
    const { error: updateError } = await adminSupabase
      .from("email_deliveries")
      .update({
        attempt_count: 1,
        error_message: null,
        last_attempt_at: lastAttemptAt,
        provider_message_id: info.messageId,
        sent_at: sentAt,
        status: "sent",
      })
      .eq("id", insertedDelivery.id);

    if (updateError) {
      console.error("Unable to update sent email delivery row", updateError);
    }

    return {
      recipientType: params.recipientType,
      recipientEmail: params.recipientEmail,
      sentAt,
      status: "sent",
      errorMessage: null,
    } satisfies DeliveryAttemptResult;
  } catch (error) {
    const errorMessage = toErrorMessage(
      error,
      "Invio email non riuscito.",
    );
    const { error: updateError } = await adminSupabase
      .from("email_deliveries")
      .update({
        attempt_count: 1,
        error_message: errorMessage,
        last_attempt_at: lastAttemptAt,
        status: "failed",
      })
      .eq("id", insertedDelivery.id);

    if (updateError) {
      console.error("Unable to update failed email delivery row", updateError);
    }

    return {
      recipientType: params.recipientType,
      recipientEmail: params.recipientEmail,
      sentAt: null,
      status: "failed",
      errorMessage,
    } satisfies DeliveryAttemptResult;
  }
}

function getFinalRequestUpdate(params: {
  deliveryResults: DeliveryAttemptResult[];
  pdfGeneratedAt: string;
  request: CertificateDeliveryRequest;
  storagePath: string;
}) {
  const studentSentAt =
    params.request.student_emailed_at ??
    params.deliveryResults.find((result) => result.recipientType === "student")
      ?.sentAt ??
    null;
  const schoolSentAt =
    params.request.school_emailed_at ??
    params.deliveryResults.find((result) => result.recipientType === "school")
      ?.sentAt ??
    null;
  const teacherSentAt =
    params.request.teacher_emailed_at ??
    params.deliveryResults.find((result) => result.recipientType === "teacher")
      ?.sentAt ??
    null;

  const deliveryCompleted =
    Boolean(studentSentAt) &&
    (!params.request.send_to_school || Boolean(schoolSentAt)) &&
    (!params.request.send_to_teacher || Boolean(teacherSentAt));

  const update: TablesUpdate<"certificate_requests"> = {
    pdf_generated_at: params.pdfGeneratedAt,
    pdf_storage_path: params.storagePath,
    status: deliveryCompleted ? "completed" : "delivery_failed",
  };

  if (studentSentAt) {
    update.student_emailed_at = studentSentAt;
  }

  if (schoolSentAt) {
    update.school_emailed_at = schoolSentAt;
  }

  if (teacherSentAt) {
    update.teacher_emailed_at = teacherSentAt;
  }

  return {
    finalStatus: deliveryCompleted ? "completed" : "delivery_failed",
    update,
  } as const;
}

export async function finalizeApprovedRequestDelivery(params: {
  requestId: string;
  triggeredByUserId: string;
}) {
  const adminSupabase = createAdminClient();
  const request = await loadRequestForDelivery(params.requestId);

  if (!canFinalizeRequestStatus(request.status)) {
    throw new Error("La richiesta non e' in uno stato che consente la consegna finale.");
  }

  try {
    const pdfBytes = await buildCertificatePdf(request);
    const storagePath = await uploadCertificatePdf({
      request,
      pdfBytes,
    });
    const pdfGeneratedAt = new Date().toISOString();

    await adminSupabase
      .from("certificate_requests")
      .update({
        pdf_generated_at: pdfGeneratedAt,
        pdf_storage_path: storagePath,
      })
      .eq("id", request.id);

    await recordSystemEvent({
      requestId: request.id,
      eventType: "certificate_pdf_generated",
      payload: {
        pdf_generated_at: pdfGeneratedAt,
        pdf_storage_path: storagePath,
        triggered_by_user_id: params.triggeredByUserId,
      },
    });

    const pendingRecipients = buildPendingRecipients(request);
    const deliveryResults: DeliveryAttemptResult[] = [];

    for (const recipient of pendingRecipients) {
      deliveryResults.push(
        await sendEmailWithDeliveryLog({
          request,
          pdfBytes,
          recipientEmail: recipient.email,
          recipientType: recipient.recipientType,
        }),
      );
    }

    const { finalStatus, update } = getFinalRequestUpdate({
      request,
      deliveryResults,
      pdfGeneratedAt,
      storagePath,
    });

    const { error: updateError } = await adminSupabase
      .from("certificate_requests")
      .update(update)
      .eq("id", request.id);

    if (updateError) {
      throw updateError;
    }

    await recordSystemEvent({
      requestId: request.id,
      eventType:
        finalStatus === "completed"
          ? "certificate_delivery_completed"
          : "certificate_delivery_failed",
      payload: {
        delivery_results: deliveryResults,
        pdf_storage_path: storagePath,
        triggered_by_user_id: params.triggeredByUserId,
      },
    });

    return {
      finalStatus,
      pdfStoragePath: storagePath,
      deliveryResults,
      errorMessage:
        finalStatus === "completed"
          ? null
          : "La consegna finale non e' stata completata per tutti i destinatari previsti.",
    } satisfies FinalizeRequestDeliveryResult;
  } catch (error) {
    const errorMessage = toErrorMessage(
      error,
      "Impossibile completare la generazione o l'invio finale del certificato.",
    );

    const { error: updateError } = await adminSupabase
      .from("certificate_requests")
      .update({
        status: "delivery_failed",
      })
      .eq("id", request.id);

    if (updateError) {
      console.error("Unable to mark request as delivery_failed", updateError);
    }

    await recordSystemEvent({
      requestId: request.id,
      eventType: "certificate_delivery_failed",
      payload: {
        error_message: errorMessage,
        pdf_storage_path: request.pdf_storage_path,
        triggered_by_user_id: params.triggeredByUserId,
      },
    });

    return {
      finalStatus: "delivery_failed",
      pdfStoragePath: request.pdf_storage_path,
      deliveryResults: [],
      errorMessage,
    } satisfies FinalizeRequestDeliveryResult;
  }
}
