import type { Enums } from "@/lib/supabase/database.types";

export type RequestStatus = Enums<"request_status">;

export const REQUEST_STATUS_ORDER: RequestStatus[] = [
  "submitted",
  "approved",
  "rejected",
  "completed",
  "delivery_failed",
  "cancelled",
];

const REQUEST_STATUS_META: Record<
  RequestStatus,
  {
    label: string;
    toneClassName: string;
    description: string;
  }
> = {
  submitted: {
    label: "Da revisionare",
    toneClassName: "border-amber-200 bg-amber-50 text-amber-700",
    description: "Richiesta in attesa di presa in carico.",
  },
  approved: {
    label: "Approvata",
    toneClassName: "border-emerald-200 bg-emerald-50 text-emerald-700",
    description: "Approvata e pronta per la generazione finale.",
  },
  rejected: {
    label: "Rifiutata",
    toneClassName: "border-rose-200 bg-rose-50 text-rose-700",
    description: "Chiusa con motivazione di rifiuto.",
  },
  completed: {
    label: "Completata",
    toneClassName: "border-sky-200 bg-sky-50 text-sky-700",
    description: "Certificato generato e consegna completata.",
  },
  delivery_failed: {
    label: "Invio fallito",
    toneClassName: "border-orange-200 bg-orange-50 text-orange-700",
    description: "Richiede attenzione per PDF o consegna.",
  },
  cancelled: {
    label: "Annullata",
    toneClassName: "border-zinc-200 bg-zinc-100 text-zinc-700",
    description: "Chiusura amministrativa eccezionale.",
  },
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  request_submitted: "Richiesta inviata",
  coordinator_notifications_queued: "Notifiche coordinatori registrate",
  admin_notifications_queued: "Notifiche admin registrate",
  request_updated_by_coordinator: "Dati aggiornati dal coordinatore",
  request_approved: "Richiesta approvata",
  request_rejected: "Richiesta rifiutata",
  certificate_pdf_generated: "PDF certificato generato",
  certificate_delivery_completed: "Consegna finale completata",
  certificate_delivery_failed: "Consegna finale fallita",
  certificate_pdf_downloaded: "PDF scaricato dal coordinatore",
};

const ACTOR_TYPE_LABELS: Record<string, string> = {
  system: "Sistema",
  coordinator: "Coordinatore",
  admin: "Admin",
};

export function getRequestStatusMeta(status: RequestStatus) {
  return REQUEST_STATUS_META[status];
}

export function getRequestStatusLabel(status: RequestStatus) {
  return getRequestStatusMeta(status).label;
}

export function isEditableRequestStatus(status: RequestStatus) {
  return status === "submitted";
}

export function canFinalizeRequestStatus(status: RequestStatus) {
  return status === "approved" || status === "delivery_failed";
}

export function formatDateTime(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("it-IT", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Rome",
  }).format(new Date(value));
}

export function formatRequestEventType(eventType: string) {
  return (
    EVENT_TYPE_LABELS[eventType] ??
    eventType
      .split("_")
      .filter(Boolean)
      .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
      .join(" ")
  );
}

export function formatActorType(actorType: string) {
  return ACTOR_TYPE_LABELS[actorType] ?? actorType;
}

export function buildCoordinatorRequestPath(requestId: string) {
  return `/coordinatore/richieste/${requestId}`;
}
