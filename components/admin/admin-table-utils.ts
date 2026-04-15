export function normalizeText(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export function compareText(
  left: string | null | undefined,
  right: string | null | undefined,
  direction: "asc" | "desc",
) {
  const leftValue = normalizeText(left);
  const rightValue = normalizeText(right);

  if (leftValue < rightValue) {
    return direction === "asc" ? -1 : 1;
  }

  if (leftValue > rightValue) {
    return direction === "asc" ? 1 : -1;
  }

  return 0;
}

export function compareNumber(
  left: number,
  right: number,
  direction: "asc" | "desc",
) {
  if (left < right) {
    return direction === "asc" ? -1 : 1;
  }

  if (left > right) {
    return direction === "asc" ? 1 : -1;
  }

  return 0;
}
