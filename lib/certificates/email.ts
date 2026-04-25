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

type NewRequestRecipientType = "coordinator" | "admin";

type NewRequestNotificationTemplate = {
  html: string;
  subject: string;
  text: string;
};

type PctoImportedStudentNotificationTemplate = {
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

function formatNewRequestCertificateTypeLabel(certificateType: "pcto" | "volontariato") {
  return certificateType === "pcto" ? "PCTO" : "volontariato";
}

function buildNewRequestNotificationTemplate(params: {
  certificateType: "pcto" | "volontariato";
  classLabel: string;
  coordinatorDashboardUrl: string;
  recipientType: NewRequestRecipientType;
  requestId: string;
  schoolNameSnapshot: string;
  serviceNameSnapshot: string;
  studentFirstName: string;
  studentLastName: string;
}) {
  const certificateTypeLabel = formatNewRequestCertificateTypeLabel(
    params.certificateType,
  );
  const subject =
    params.recipientType === "coordinator"
      ? `Nuova richiesta certificato ${certificateTypeLabel} - ${params.serviceNameSnapshot}`
      : `Nuova richiesta certificato ${certificateTypeLabel} da assegnare`;

  const intro =
    params.recipientType === "coordinator"
      ? "E' stata inviata una nuova richiesta per il servizio di cui sei responsabile."
      : "E' stata inviata una nuova richiesta con servizio non presente in elenco.";
  const actionLine =
    params.recipientType === "coordinator"
      ? "Accedi all'area coordinatore per revisionare e gestire la richiesta."
      : "Accedi all'area admin/coordinatore per prendere in carico la richiesta.";

  const escapedIntro = escapeHtml(intro);
  const escapedActionLine = escapeHtml(actionLine);
  const escapedStudent = escapeHtml(
    `${params.studentFirstName} ${params.studentLastName}`,
  );
  const escapedClassLabel = escapeHtml(params.classLabel);
  const escapedSchoolName = escapeHtml(params.schoolNameSnapshot);
  const escapedServiceName = escapeHtml(params.serviceNameSnapshot);
  const escapedCertificateTypeLabel = escapeHtml(certificateTypeLabel);
  const escapedDashboardUrl = escapeHtml(params.coordinatorDashboardUrl);
  const escapedRequestId = escapeHtml(params.requestId);

  return {
    subject,
    text: [
      "Buongiorno,",
      "",
      intro,
      actionLine,
      "",
      `Studente: ${params.studentFirstName} ${params.studentLastName}`,
      `Classe: ${params.classLabel}`,
      `Scuola: ${params.schoolNameSnapshot}`,
      `Servizio: ${params.serviceNameSnapshot}`,
      `Tipo certificato: ${certificateTypeLabel}`,
      `ID richiesta: ${params.requestId}`,
      "",
      `Area coordinatore: ${params.coordinatorDashboardUrl}`,
      "",
      "Giovani per la Pace",
    ].join("\n"),
    html: `
      <div style="font-family: Georgia, 'Times New Roman', serif; color: #27272a; line-height: 1.6;">
        <p>Buongiorno,</p>
        <p>${escapedIntro}</p>
        <p>${escapedActionLine}</p>
        <p>
          <strong>Studente:</strong> ${escapedStudent}<br />
          <strong>Classe:</strong> ${escapedClassLabel}<br />
          <strong>Scuola:</strong> ${escapedSchoolName}<br />
          <strong>Servizio:</strong> ${escapedServiceName}<br />
          <strong>Tipo certificato:</strong> ${escapedCertificateTypeLabel}<br />
          <strong>ID richiesta:</strong> ${escapedRequestId}
        </p>
        <p>
          <a href="${escapedDashboardUrl}">Apri area coordinatore</a>
        </p>
        <p style="margin-top: 24px;">Giovani per la Pace</p>
      </div>
    `.trim(),
  } satisfies NewRequestNotificationTemplate;
}

function buildPctoImportedStudentNotificationTemplate(params: {
  coordinatorDashboardUrl: string;
  serviceName: string;
  sourceCode: string;
  studentFirstName: string;
  studentLastName: string;
}) {
  const subject = `Richiesta certificato PCTO - ${params.studentFirstName} ${params.studentLastName}`;
  const escapedStudent = escapeHtml(
    `${params.studentFirstName} ${params.studentLastName}`,
  );
  const escapedSourceCode = escapeHtml(params.sourceCode);
  const escapedServiceName = escapeHtml(params.serviceName);
  const escapedDashboardUrl = escapeHtml(params.coordinatorDashboardUrl);

  return {
    subject,
    text: [
      "Buongiorno,",
      "",
      "Uno studente gia' presente nell'elenco PCTO ha richiesto il certificato usando il proprio codice ID.",
      "",
      `Studente: ${params.studentFirstName} ${params.studentLastName}`,
      `Codice ID: ${params.sourceCode}`,
      `Servizio: ${params.serviceName}`,
      "",
      "Accedi all'area coordinatore, sezione Studenti PCTO, per generare e inviare il certificato se opportuno.",
      "",
      `Area coordinatore PCTO: ${params.coordinatorDashboardUrl}`,
      "",
      "Giovani per la Pace",
    ].join("\n"),
    html: `
      <div style="font-family: Georgia, 'Times New Roman', serif; color: #27272a; line-height: 1.6;">
        <p>Buongiorno,</p>
        <p>Uno studente gia' presente nell'elenco PCTO ha richiesto il certificato usando il proprio codice ID.</p>
        <p>
          <strong>Studente:</strong> ${escapedStudent}<br />
          <strong>Codice ID:</strong> ${escapedSourceCode}<br />
          <strong>Servizio:</strong> ${escapedServiceName}
        </p>
        <p>Accedi all'area coordinatore, sezione Studenti PCTO, per generare e inviare il certificato se opportuno.</p>
        <p>
          <a href="${escapedDashboardUrl}">Apri Studenti PCTO</a>
        </p>
        <p style="margin-top: 24px;">Giovani per la Pace</p>
      </div>
    `.trim(),
  } satisfies PctoImportedStudentNotificationTemplate;
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

export async function sendNewRequestNotificationEmail(params: {
  certificateType: "pcto" | "volontariato";
  classLabel: string;
  coordinatorDashboardUrl: string;
  recipientEmail: string;
  recipientType: NewRequestRecipientType;
  requestId: string;
  schoolNameSnapshot: string;
  serviceNameSnapshot: string;
  studentFirstName: string;
  studentLastName: string;
}) {
  const transporter = getTransporter();
  const gmail = getGmailEnv();
  const template = buildNewRequestNotificationTemplate(params);

  const info = await transporter.sendMail({
    from: `"Giovani per la Pace" <${gmail.user}>`,
    replyTo: gmail.user,
    to: params.recipientEmail,
    subject: template.subject,
    text: template.text,
    html: template.html,
  });

  return {
    messageId: info.messageId ?? null,
  };
}

export async function sendPctoImportedStudentCertificateRequestEmail(params: {
  coordinatorDashboardUrl: string;
  recipientEmail: string;
  serviceName: string;
  sourceCode: string;
  studentFirstName: string;
  studentLastName: string;
}) {
  const transporter = getTransporter();
  const gmail = getGmailEnv();
  const template = buildPctoImportedStudentNotificationTemplate(params);

  const info = await transporter.sendMail({
    from: `"Giovani per la Pace" <${gmail.user}>`,
    replyTo: gmail.user,
    to: params.recipientEmail,
    subject: template.subject,
    text: template.text,
    html: template.html,
  });

  return {
    messageId: info.messageId ?? null,
  };
}
