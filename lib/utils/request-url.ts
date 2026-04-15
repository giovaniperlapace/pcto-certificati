import { headers } from "next/headers";

export async function getBaseUrl() {
  const headerStore = await headers();
  const origin = headerStore.get("origin");
  const referer = headerStore.get("referer");

  if (origin) {
    return origin;
  }

  if (referer) {
    return new URL(referer).origin;
  }

  const forwardedHost = headerStore.get("x-forwarded-host");
  const host = forwardedHost ?? headerStore.get("host");
  const forwardedProto = headerStore.get("x-forwarded-proto");
  const protocol =
    forwardedProto ??
    (host?.includes("localhost") || host?.startsWith("127.0.0.1")
      ? "http"
      : "https");

  if (!host) {
    throw new Error("Impossibile determinare l'URL base della richiesta.");
  }

  return `${protocol}://${host}`;
}
