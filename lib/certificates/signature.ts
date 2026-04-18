import { createAdminClient } from "@/lib/supabase/admin";

export type CertificateSignatureSettings = {
  issuedInCity: string;
  signatureImageFileName: string;
  signerEmail: string | null;
  signerName: string;
  signerPhone: string | null;
  signerRole: string;
};

const DEFAULT_CERTIFICATE_SIGNATURE_SETTINGS: CertificateSignatureSettings = {
  issuedInCity: "Roma",
  signatureImageFileName: "signature.png",
  signerName: "Prof. Stefano Orlando",
  signerRole: "Coordinatore attivita' giovanili",
  signerPhone: "328/5699419",
  signerEmail: "info@giovaniperlapace.it",
};

function normalizeOptionalString(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export async function loadCertificateSignatureSettings() {
  const adminSupabase = createAdminClient();
  const { data, error } = await adminSupabase
    .from("certificate_signature_settings")
    .select(
      "issued_in_city, signature_image_file_name, signer_name, signer_role, signer_phone, signer_email",
    )
    .eq("id", "default")
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return DEFAULT_CERTIFICATE_SIGNATURE_SETTINGS;
  }

  return {
    issuedInCity: data.issued_in_city,
    signatureImageFileName: data.signature_image_file_name,
    signerName: data.signer_name,
    signerRole: data.signer_role,
    signerPhone: normalizeOptionalString(data.signer_phone),
    signerEmail: normalizeOptionalString(data.signer_email),
  } satisfies CertificateSignatureSettings;
}
