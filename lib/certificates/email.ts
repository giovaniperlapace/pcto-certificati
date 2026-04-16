import nodemailer from "nodemailer";
import {
  buildCertificateFileName,
  formatCertificateTypeLabel,
  getStudentFullName,
  type CertificateDeliveryRequest,
} from "@/lib/certificates/content";
import { getGmailEnv } from "@/lib/supabase/env";

type CertificateRecipientType = "student" | "school" | "teacher";

type CertificateEmailTemplate = {
  html: string;
  subject: string;
  text: string;
};

let cachedTransporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getTransporter() {
  if (cachedTransporter) {
    return cachedTransporter;
  }

  const gmail = getGmailEnv();

  cachedTransporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: gmail.user,
      pass: gmail.appPassword,
    },
  });

  return cachedTransporter;
}

function buildTemplate(
  request: CertificateDeliveryRequest,
  recipientType: CertificateRecipientType,
) {
  const certificateTypeLabel = formatCertificateTypeLabel(request.certificate_type);
  const studentFullName = getStudentFullName(request);

  let greeting = "Buongiorno,";
  let intro =
    `in allegato trovi il certificato ${certificateTypeLabel} intestato a ${studentFullName}.`;
  let closing =
    "Per qualsiasi necessità puoi rispondere a questa email.";
  let subject = `${certificateTypeLabel} - ${studentFullName}`;

  if (recipientType === "school") {
    greeting = "Buongiorno,";
    intro =
      `in allegato trovi una copia del certificato ${certificateTypeLabel} rilasciato a ${studentFullName}, classe ${request.class_label}, ${request.school_name_snapshot}.`;
    closing =
      "La copia viene inviata perché prevista nelle preferenze della richiesta approvata.";
    subject = `Copia certificato ${certificateTypeLabel} - ${studentFullName}`;
  }

  if (recipientType === "teacher") {
    const teacherName = request.teacher_name_snapshot?.trim();

    greeting = teacherName ? `Buongiorno ${teacherName},` : "Buongiorno,";
    intro =
      `in allegato trovi una copia del certificato ${certificateTypeLabel} rilasciato a ${studentFullName}, classe ${request.class_label}.`;
    closing =
      "La copia viene inviata perché prevista nelle preferenze della richiesta approvata.";
    subject = `Copia docente certificato ${certificateTypeLabel} - ${studentFullName}`;
  }

  const escapedGreeting = escapeHtml(greeting);
  const escapedIntro = escapeHtml(intro);
  const escapedClosing = escapeHtml(closing);
  const escapedServiceName = escapeHtml(request.service_name_snapshot);
  const escapedYear = escapeHtml(request.schoolYearLabel);

  return {
    subject,
    text: [
      greeting,
      "",
      intro,
      `Servizio: ${request.service_name_snapshot}`,
      `Anno scolastico: ${request.schoolYearLabel}`,
      "",
      closing,
      "",
      "Giovani per la Pace",
    ].join("\n"),
    html: `
      <div style="font-family: Georgia, 'Times New Roman', serif; color: #27272a; line-height: 1.6;">
        <p>${escapedGreeting}</p>
        <p>${escapedIntro}</p>
        <p>
          <strong>Servizio:</strong> ${escapedServiceName}<br />
          <strong>Anno scolastico:</strong> ${escapedYear}
        </p>
        <p>${escapedClosing}</p>
        <p style="margin-top: 24px;">Giovani per la Pace</p>
      </div>
    `.trim(),
  } satisfies CertificateEmailTemplate;
}

export async function sendCertificateEmail(params: {
  pdfBytes: Uint8Array;
  recipientEmail: string;
  recipientType: CertificateRecipientType;
  request: CertificateDeliveryRequest;
}) {
  const transporter = getTransporter();
  const gmail = getGmailEnv();
  const template = buildTemplate(params.request, params.recipientType);

  const info = await transporter.sendMail({
    from: `"Giovani per la Pace" <${gmail.user}>`,
    replyTo: gmail.user,
    to: params.recipientEmail,
    subject: template.subject,
    text: template.text,
    html: template.html,
    attachments: [
      {
        filename: buildCertificateFileName(params.request),
        content: Buffer.from(params.pdfBytes),
        contentType: "application/pdf",
      },
    ],
  });

  return {
    messageId: info.messageId ?? null,
  };
}
