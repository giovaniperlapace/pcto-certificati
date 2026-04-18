import { NextResponse } from "next/server";
import { assertCoordinator } from "@/lib/auth/admin";
import {
  buildCertificateFileName,
  CERTIFICATE_STORAGE_BUCKET,
  type CertificateDeliveryRequest,
} from "@/lib/certificates/content";
import { createAdminClient } from "@/lib/supabase/admin";

async function recordDownloadEvent(params: {
  coordinatorId: string;
  requestId: string;
  userId: string;
  pdfStoragePath: string;
}) {
  try {
    const adminSupabase = createAdminClient();
    const { error } = await adminSupabase.from("request_events").insert({
      request_id: params.requestId,
      actor_type: "coordinator",
      actor_user_id: params.userId,
      event_type: "certificate_pdf_downloaded",
      payload: {
        coordinator_id: params.coordinatorId,
        pdf_storage_path: params.pdfStoragePath,
      },
    });

    if (error) {
      console.error("recordDownloadEvent failed", error);
    }
  } catch (error) {
    console.error("recordDownloadEvent unexpected failure", error);
  }
}

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

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const { coordinator, supabase, user } = await assertCoordinator();

  if (!coordinator) {
    return NextResponse.json({ error: "Coordinatore non disponibile." }, { status: 403 });
  }

  const { data: request, error: requestError } = await supabase
    .from("certificate_requests")
    .select(
      "id, status, pdf_storage_path, certificate_type, certificate_heading_text, certificate_body_text, student_first_name, student_last_name, student_email, class_label, school_id, school_name_snapshot, service_name_snapshot, service_schedule_snapshot, service_address_snapshot, school_year_id, send_to_school, send_to_teacher, teacher_name_snapshot, teacher_email_snapshot, approved_at, hours_requested, hours_approved, pdf_generated_at, student_emailed_at, school_emailed_at, teacher_emailed_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (requestError) {
    throw requestError;
  }

  if (!request?.pdf_storage_path) {
    return NextResponse.json(
      { error: "Il PDF di questa richiesta non e' ancora disponibile." },
      { status: 404 },
    );
  }

  if (
    !ALLOWED_DOWNLOAD_STATUSES.includes(
      request.status as (typeof ALLOWED_DOWNLOAD_STATUSES)[number],
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

  const adminSupabase = createAdminClient();
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

  if (!schoolYear?.label) {
    throw new Error("Anno scolastico della richiesta non disponibile.");
  }

  if (schoolError) {
    throw schoolError;
  }

  const deliveryRequest = {
    ...request,
    schoolEmail: school?.school_email ?? null,
    schoolYearLabel: schoolYear.label,
  } satisfies CertificateDeliveryRequest;
  const { data: pdfFile, error: downloadError } = await adminSupabase.storage
    .from(CERTIFICATE_STORAGE_BUCKET)
    .download(request.pdf_storage_path);

  if (downloadError) {
    throw downloadError;
  }

  await recordDownloadEvent({
    requestId: request.id,
    coordinatorId: coordinator.id,
    userId: user.id,
    pdfStoragePath: request.pdf_storage_path,
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
