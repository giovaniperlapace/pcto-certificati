import { NextResponse } from "next/server";
import { assertAdmin } from "@/lib/auth/admin";
import {
  buildCertificateFileName,
  CERTIFICATE_STORAGE_BUCKET,
  type CertificateDeliveryRequest,
} from "@/lib/certificates/content";
import { createAdminClient } from "@/lib/supabase/admin";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const ALLOWED_DOWNLOAD_STATUSES = [
  "approved",
  "completed",
  "delivery_failed",
] as const;

async function recordDownloadEvent(params: {
  requestId: string;
  userId: string;
  pdfStoragePath: string;
}) {
  try {
    const adminSupabase = createAdminClient();
    const { error } = await adminSupabase.from("request_events").insert({
      request_id: params.requestId,
      actor_type: "admin",
      actor_user_id: params.userId,
      event_type: "certificate_pdf_downloaded",
      payload: {
        pdf_storage_path: params.pdfStoragePath,
      },
    });

    if (error) {
      console.error("recordAdminDownloadEvent failed", error);
    }
  } catch (error) {
    console.error("recordAdminDownloadEvent unexpected failure", error);
  }
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const { user } = await assertAdmin();
  const adminSupabase = createAdminClient();

  const { data: certificateRequest, error: requestError } = await adminSupabase
    .from("certificate_requests")
    .select(
      "id, status, pdf_storage_path, certificate_type, certificate_heading_text, certificate_body_text, student_first_name, student_last_name, student_email, class_label, school_id, school_name_snapshot, service_name_snapshot, service_schedule_snapshot, service_address_snapshot, school_year_id, send_to_school, send_to_teacher, teacher_name_snapshot, teacher_email_snapshot, approved_at, hours_requested, hours_approved, pdf_generated_at, student_emailed_at, school_emailed_at, teacher_emailed_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (requestError) {
    throw requestError;
  }

  if (!certificateRequest?.pdf_storage_path) {
    return NextResponse.json(
      { error: "Il PDF di questa richiesta non e' ancora disponibile." },
      { status: 404 },
    );
  }

  if (
    !ALLOWED_DOWNLOAD_STATUSES.includes(
      certificateRequest.status as (typeof ALLOWED_DOWNLOAD_STATUSES)[number],
    )
  ) {
    return NextResponse.json(
      {
        error:
          "Il PDF puo' essere scaricato solo per richieste approvate o in consegna.",
      },
      { status: 409 },
    );
  }

  const [{ data: schoolYear, error: schoolYearError }, { data: school, error: schoolError }] =
    await Promise.all([
      adminSupabase
        .from("school_years")
        .select("label")
        .eq("id", certificateRequest.school_year_id)
        .maybeSingle(),
      certificateRequest.school_id
        ? adminSupabase
            .from("schools")
            .select("school_email")
            .eq("id", certificateRequest.school_id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);

  if (schoolYearError) {
    throw schoolYearError;
  }

  if (!schoolYear?.label) {
    throw new Error("Anno scolastico della richiesta non disponibile.");
  }

  if (schoolError) {
    throw schoolError;
  }

  const deliveryRequest = {
    ...certificateRequest,
    schoolEmail: school?.school_email ?? null,
    schoolYearLabel: schoolYear.label,
  } satisfies CertificateDeliveryRequest;
  const { data: pdfFile, error: downloadError } = await adminSupabase.storage
    .from(CERTIFICATE_STORAGE_BUCKET)
    .download(certificateRequest.pdf_storage_path);

  if (downloadError) {
    throw downloadError;
  }

  await recordDownloadEvent({
    requestId: certificateRequest.id,
    userId: user.id,
    pdfStoragePath: certificateRequest.pdf_storage_path,
  });

  const pdfBuffer = Buffer.from(await pdfFile.arrayBuffer());

  return new NextResponse(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${buildCertificateFileName(
        deliveryRequest,
      )}"`,
    },
  });
}
