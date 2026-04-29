import nodemailer from "nodemailer";
import { getGmailEnv } from "@/lib/supabase/env";

type SendGmailEmailInput = {
  html?: string | null;
  subject: string;
  text?: string | null;
  to: string;
};

let cachedTransporter: ReturnType<typeof nodemailer.createTransport> | null =
  null;

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

export async function sendGmailEmail(input: SendGmailEmailInput) {
  const gmail = getGmailEnv();
  const transporter = getTransporter();

  await transporter.sendMail({
    from: `"Giovani per la Pace" <${gmail.user}>`,
    replyTo: gmail.user,
    to: input.to,
    subject: input.subject,
    text: input.text ?? undefined,
    html: input.html ?? undefined,
  });
}
