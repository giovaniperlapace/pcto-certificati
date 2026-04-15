"use client";

import type { MouseEvent, ReactNode } from "react";
import { useEffect } from "react";
import { useEffectEvent } from "react";

type TableMetric = {
  label: string;
  value: string;
};

type TablePanelProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  metrics?: TableMetric[];
  children: ReactNode;
};

type SortableHeaderButtonProps = {
  label: string;
  isActive: boolean;
  direction: "asc" | "desc";
  onClick: () => void;
};

type TableDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  widthClassName?: string;
};

type TableFieldProps = {
  label: string;
  children: ReactNode;
  className?: string;
};

type TableCheckboxFieldProps = {
  label: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

type TableBadgeProps = {
  tone?: "neutral" | "positive" | "warning" | "info";
  children: ReactNode;
};

const BADGE_TONES: Record<NonNullable<TableBadgeProps["tone"]>, string> = {
  neutral: "border-zinc-200 bg-zinc-100 text-zinc-700",
  positive: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  info: "border-sky-200 bg-sky-50 text-sky-700",
};

export function TablePanel({
  title,
  description,
  action,
  metrics,
  children,
}: TablePanelProps) {
  return (
    <section className="rounded-[1.75rem] border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 border-b border-zinc-200 pb-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-zinc-950">
              {title}
            </h2>
            {description ? (
              <p className="mt-1 max-w-3xl text-sm leading-6 text-zinc-600">
                {description}
              </p>
            ) : null}
          </div>

          {metrics && metrics.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {metrics.map((metric) => (
                <div
                  key={metric.label}
                  className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-700"
                >
                  <span className="font-semibold text-zinc-950">{metric.value}</span>{" "}
                  {metric.label}
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {action ? <div className="shrink-0">{action}</div> : null}
      </div>

      <div className="mt-5">{children}</div>
    </section>
  );
}

export function TableScroller({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200">
      {children}
    </div>
  );
}

export function SortableHeaderButton({
  label,
  isActive,
  direction,
  onClick,
}: SortableHeaderButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 font-medium transition hover:text-zinc-950"
    >
      <span>{label}</span>
      <span className="text-xs text-zinc-400">{isActive ? (direction === "asc" ? "↑" : "↓") : "·"}</span>
    </button>
  );
}

export function TableActionButton({
  children,
  onClick,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:border-zinc-950 hover:text-zinc-950"
    >
      {children}
    </button>
  );
}

export function TableBadge({
  tone = "neutral",
  children,
}: TableBadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
        BADGE_TONES[tone],
      ].join(" ")}
    >
      {children}
    </span>
  );
}

export function StatusBadge({
  isActive,
  activeLabel,
  inactiveLabel,
}: {
  isActive: boolean;
  activeLabel: string;
  inactiveLabel: string;
}) {
  return (
    <TableBadge tone={isActive ? "positive" : "neutral"}>
      {isActive ? activeLabel : inactiveLabel}
    </TableBadge>
  );
}

export function TableDialog({
  open,
  title,
  description,
  onClose,
  children,
  widthClassName = "max-w-4xl",
}: TableDialogProps) {
  const handleEscape = useEffectEvent((event: KeyboardEvent) => {
    if (event.key === "Escape") {
      onClose();
    }
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-zinc-950/45 px-4 py-8">
      <div
        className="absolute inset-0"
        aria-hidden="true"
        onClick={onClose}
      />

      <div
        className={[
          "relative w-full rounded-[1.75rem] border border-zinc-200 bg-white p-6 shadow-2xl",
          widthClassName,
        ].join(" ")}
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-table-dialog-title"
      >
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4 border-b border-zinc-200 pb-4">
          <div className="space-y-1">
            <h3
              id="admin-table-dialog-title"
              className="text-xl font-semibold tracking-tight text-zinc-950"
            >
              {title}
            </h3>
            {description ? (
              <p className="max-w-2xl text-sm leading-6 text-zinc-600">
                {description}
              </p>
            ) : null}
          </div>

          <TableActionButton onClick={onClose}>Chiudi</TableActionButton>
        </div>

        {children}
      </div>
    </div>
  );
}

export function TableField({
  label,
  children,
  className,
}: TableFieldProps) {
  return (
    <label className={["space-y-2", className].filter(Boolean).join(" ")}>
      <span className="text-sm font-medium text-zinc-800">{label}</span>
      {children}
    </label>
  );
}

export function TableCheckboxField({
  label,
  description,
  children,
  className,
}: TableCheckboxFieldProps) {
  return (
    <label
      className={[
        "flex items-start gap-3 rounded-2xl border border-zinc-200 px-4 py-3 text-sm text-zinc-700",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span className="pt-0.5">{children}</span>
      <span className="space-y-1">
        <span className="block font-medium text-zinc-900">{label}</span>
        {description ? (
          <span className="block text-xs leading-5 text-zinc-500">
            {description}
          </span>
        ) : null}
      </span>
    </label>
  );
}

export function TableFormActions({
  onCancel,
  submitLabel,
  destructiveAction,
}: {
  onCancel: () => void;
  submitLabel: string;
  destructiveAction?: {
    label: string;
    confirmMessage: string;
    formAction: (formData: FormData) => void | Promise<void>;
  };
}) {
  function handleDestructiveClick(event: MouseEvent<HTMLButtonElement>) {
    if (!destructiveAction) {
      return;
    }

    const isConfirmed = window.confirm(destructiveAction.confirmMessage);

    if (!isConfirmed) {
      event.preventDefault();
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-3 border-t border-zinc-200 pt-5">
      {destructiveAction ? (
        <button
          type="submit"
          formAction={destructiveAction.formAction}
          formNoValidate
          onClick={handleDestructiveClick}
          className="mr-auto rounded-full border border-rose-300 bg-rose-50 px-5 py-3 text-sm font-medium text-rose-700 transition hover:bg-rose-100"
        >
          {destructiveAction.label}
        </button>
      ) : null}

      <TableActionButton onClick={onCancel}>Annulla</TableActionButton>
      <button
        type="submit"
        className="rounded-full bg-zinc-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-800"
      >
        {submitLabel}
      </button>
    </div>
  );
}
