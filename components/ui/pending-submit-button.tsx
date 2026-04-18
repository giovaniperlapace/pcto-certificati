"use client";

import { useFormStatus } from "react-dom";

type PendingSubmitButtonProps = {
  className: string;
  idleLabel: string;
  pendingLabel: string;
};

export function PendingSubmitButton({
  className,
  idleLabel,
  pendingLabel,
}: PendingSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      className={[
        className,
        pending ? "cursor-wait opacity-70" : "",
      ].join(" ")}
    >
      {pending ? pendingLabel : idleLabel}
    </button>
  );
}
