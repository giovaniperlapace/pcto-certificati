import type { RequestStatus } from "@/lib/coordinator/requests";
import { getRequestStatusMeta } from "@/lib/coordinator/requests";

type RequestStatusBadgeProps = {
  status: RequestStatus;
};

export function RequestStatusBadge({ status }: RequestStatusBadgeProps) {
  const meta = getRequestStatusMeta(status);

  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
        meta.toneClassName,
      ].join(" ")}
    >
      {meta.label}
    </span>
  );
}
