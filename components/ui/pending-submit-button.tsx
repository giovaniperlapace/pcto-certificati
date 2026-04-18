"use client";

import type { ComponentPropsWithoutRef, MouseEvent } from "react";
import { useState } from "react";
import { useFormStatus } from "react-dom";

type PendingSubmitButtonProps = {
  className: string;
  idleLabel: string;
  pendingLabel: string;
  pendingClassName?: string;
  pendingLabelMode?: "form" | "clicked";
} & Omit<ComponentPropsWithoutRef<"button">, "children" | "type">;

export function PendingSubmitButton({
  className,
  idleLabel,
  pendingLabel,
  pendingClassName = "cursor-wait opacity-70",
  pendingLabelMode = "form",
  disabled,
  onClick,
  ...buttonProps
}: PendingSubmitButtonProps) {
  const { pending } = useFormStatus();
  const [wasClicked, setWasClicked] = useState(false);
  const isDisabled = disabled || pending;
  const shouldShowPendingLabel =
    pending && (pendingLabelMode === "form" || wasClicked);

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    onClick?.(event);

    if (!event.defaultPrevented) {
      setWasClicked(true);
    }
  }

  return (
    <button
      type="submit"
      disabled={isDisabled}
      aria-disabled={isDisabled}
      onClick={handleClick}
      className={[
        className,
        pending ? pendingClassName : "",
      ]
        .filter(Boolean)
        .join(" ")}
      {...buttonProps}
    >
      {shouldShowPendingLabel ? pendingLabel : idleLabel}
    </button>
  );
}
