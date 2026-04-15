export function readRequiredString(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Il campo ${key} e' obbligatorio.`);
  }

  return value.trim();
}

export function readOptionalString(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  return normalized === "" ? null : normalized;
}

export function readOptionalId(formData: FormData, key: string) {
  return readOptionalString(formData, key);
}

export function readBoolean(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

export function readRedirectPath(formData: FormData, fallback: string) {
  const value = readOptionalString(formData, "redirect_to");

  if (!value || !value.startsWith("/")) {
    return fallback;
  }

  return value;
}
