type FlashMessageProps = {
  error?: string | null;
  success?: string | null;
};

export function FlashMessage({ error, success }: FlashMessageProps) {
  if (!error && !success) {
    return null;
  }

  const isError = Boolean(error);
  const message = error ?? success;

  return (
    <div
      className={[
        "rounded-2xl border px-4 py-3 text-sm",
        isError
          ? "border-rose-200 bg-rose-50 text-rose-700"
          : "border-emerald-200 bg-emerald-50 text-emerald-700",
      ].join(" ")}
    >
      {message}
    </div>
  );
}
