"use client";

import Link from "next/link";
import { startTransition, useDeferredValue, useState } from "react";
import {
  SortableHeaderButton,
  TableActionButton,
  TablePanel,
  TableScroller,
} from "@/components/admin/admin-table-pattern";
import {
  compareNumber,
  compareText,
  normalizeText,
} from "@/components/admin/admin-table-utils";
import { RequestStatusBadge } from "@/components/coordinator/request-status-badge";
import {
  formatDateTime,
  getRequestStatusLabel,
  REQUEST_STATUS_ORDER,
} from "@/lib/coordinator/requests";
import type { Tables } from "@/lib/supabase/database.types";

type RequestRow = Pick<
  Tables<"certificate_requests">,
  | "id"
  | "school_name_snapshot"
  | "service_name_snapshot"
  | "status"
  | "student_first_name"
  | "student_last_name"
  | "submitted_at"
>;

type RequestsAdminTableProps = {
  requests: RequestRow[];
};

type SortKey =
  | "student_first_name"
  | "student_last_name"
  | "school_name_snapshot"
  | "service_name_snapshot"
  | "status"
  | "submitted_at";

export function RequestsAdminTable({ requests }: RequestsAdminTableProps) {
  const [firstNameFilter, setFirstNameFilter] = useState("");
  const [lastNameFilter, setLastNameFilter] = useState("");
  const [schoolFilter, setSchoolFilter] = useState("");
  const [serviceFilter, setServiceFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("submitted_at");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const deferredFirstNameFilter = useDeferredValue(firstNameFilter);
  const deferredLastNameFilter = useDeferredValue(lastNameFilter);
  const deferredSchoolFilter = useDeferredValue(schoolFilter);
  const deferredServiceFilter = useDeferredValue(serviceFilter);
  const deferredDateFilter = useDeferredValue(dateFilter);

  const visibleRequests = requests
    .filter((request) => {
      if (
        deferredFirstNameFilter &&
        !normalizeText(request.student_first_name).includes(
          normalizeText(deferredFirstNameFilter),
        )
      ) {
        return false;
      }

      if (
        deferredLastNameFilter &&
        !normalizeText(request.student_last_name).includes(
          normalizeText(deferredLastNameFilter),
        )
      ) {
        return false;
      }

      if (
        deferredSchoolFilter &&
        !normalizeText(request.school_name_snapshot).includes(
          normalizeText(deferredSchoolFilter),
        )
      ) {
        return false;
      }

      if (
        deferredServiceFilter &&
        !normalizeText(request.service_name_snapshot).includes(
          normalizeText(deferredServiceFilter),
        )
      ) {
        return false;
      }

      if (statusFilter !== "all" && request.status !== statusFilter) {
        return false;
      }

      if (
        deferredDateFilter &&
        !normalizeText(formatDateTime(request.submitted_at)).includes(
          normalizeText(deferredDateFilter),
        )
      ) {
        return false;
      }

      return true;
    })
    .toSorted((left, right) => {
      switch (sortKey) {
        case "student_first_name":
          return compareText(
            left.student_first_name,
            right.student_first_name,
            sortDirection,
          );
        case "school_name_snapshot":
          return compareText(
            left.school_name_snapshot,
            right.school_name_snapshot,
            sortDirection,
          );
        case "service_name_snapshot":
          return compareText(
            left.service_name_snapshot,
            right.service_name_snapshot,
            sortDirection,
          );
        case "status":
          return compareText(
            getRequestStatusLabel(left.status),
            getRequestStatusLabel(right.status),
            sortDirection,
          );
        case "submitted_at":
          return compareNumber(
            Date.parse(left.submitted_at),
            Date.parse(right.submitted_at),
            sortDirection,
          );
        case "student_last_name":
        default:
          return compareText(
            left.student_last_name,
            right.student_last_name,
            sortDirection,
          );
      }
    });

  const totalRequests = requests.length;
  const submittedRequests = requests.filter(
    (request) => request.status === "submitted",
  ).length;
  const completedRequests = requests.filter(
    (request) => request.status === "completed",
  ).length;
  const attentionRequests = requests.filter(
    (request) => request.status === "delivery_failed",
  ).length;

  function toggleSort(nextKey: SortKey) {
    if (sortKey === nextKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(nextKey);
    setSortDirection(nextKey === "submitted_at" ? "desc" : "asc");
  }

  function resetFilters() {
    startTransition(() => {
      setFirstNameFilter("");
      setLastNameFilter("");
      setSchoolFilter("");
      setServiceFilter("");
      setStatusFilter("all");
      setDateFilter("");
    });
  }

  return (
    <TablePanel
      title="Richieste ricevute"
      description="Elenco completo delle richieste arrivate dal form pubblico, ordinato dalla piu' recente alla meno recente."
      metrics={[
        { label: "totali", value: String(totalRequests) },
        { label: "da revisionare", value: String(submittedRequests) },
        { label: "completate", value: String(completedRequests) },
        { label: "da attenzionare", value: String(attentionRequests) },
      ]}
    >
      <TableScroller>
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-zinc-50 text-zinc-700">
            <tr>
              <th className="px-4 py-3">
                <SortableHeaderButton
                  label="Nome"
                  isActive={sortKey === "student_first_name"}
                  direction={sortDirection}
                  onClick={() => toggleSort("student_first_name")}
                />
              </th>
              <th className="px-4 py-3">
                <SortableHeaderButton
                  label="Cognome"
                  isActive={sortKey === "student_last_name"}
                  direction={sortDirection}
                  onClick={() => toggleSort("student_last_name")}
                />
              </th>
              <th className="px-4 py-3">
                <SortableHeaderButton
                  label="Scuola"
                  isActive={sortKey === "school_name_snapshot"}
                  direction={sortDirection}
                  onClick={() => toggleSort("school_name_snapshot")}
                />
              </th>
              <th className="px-4 py-3">
                <SortableHeaderButton
                  label="Servizio"
                  isActive={sortKey === "service_name_snapshot"}
                  direction={sortDirection}
                  onClick={() => toggleSort("service_name_snapshot")}
                />
              </th>
              <th className="px-4 py-3">
                <SortableHeaderButton
                  label="Stato"
                  isActive={sortKey === "status"}
                  direction={sortDirection}
                  onClick={() => toggleSort("status")}
                />
              </th>
              <th className="px-4 py-3">
                <SortableHeaderButton
                  label="Data richiesta"
                  isActive={sortKey === "submitted_at"}
                  direction={sortDirection}
                  onClick={() => toggleSort("submitted_at")}
                />
              </th>
              <th className="px-4 py-3 text-right">Azioni</th>
            </tr>
            <tr>
              <th className="px-2 pb-3">
                <input
                  value={firstNameFilter}
                  onChange={(event) => setFirstNameFilter(event.target.value)}
                  placeholder="Filtro nome"
                  className="w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-xs"
                />
              </th>
              <th className="px-2 pb-3">
                <input
                  value={lastNameFilter}
                  onChange={(event) => setLastNameFilter(event.target.value)}
                  placeholder="Filtro cognome"
                  className="w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-xs"
                />
              </th>
              <th className="px-2 pb-3">
                <input
                  value={schoolFilter}
                  onChange={(event) => setSchoolFilter(event.target.value)}
                  placeholder="Filtro scuola"
                  className="w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-xs"
                />
              </th>
              <th className="px-2 pb-3">
                <input
                  value={serviceFilter}
                  onChange={(event) => setServiceFilter(event.target.value)}
                  placeholder="Filtro servizio"
                  className="w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-xs"
                />
              </th>
              <th className="px-2 pb-3">
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-xs"
                >
                  <option value="all">Tutti</option>
                  {REQUEST_STATUS_ORDER.map((status) => (
                    <option key={status} value={status}>
                      {getRequestStatusLabel(status)}
                    </option>
                  ))}
                </select>
              </th>
              <th className="px-2 pb-3">
                <input
                  value={dateFilter}
                  onChange={(event) => setDateFilter(event.target.value)}
                  placeholder="Filtro data"
                  className="w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-xs"
                />
              </th>
              <th className="px-2 pb-3 text-right">
                <TableActionButton onClick={resetFilters}>Reset</TableActionButton>
              </th>
            </tr>
          </thead>
          <tbody>
            {visibleRequests.length > 0 ? (
              visibleRequests.map((request) => (
                <tr
                  key={request.id}
                  className="border-t border-zinc-200 transition hover:bg-zinc-50"
                >
                  <td className="px-4 py-3 font-medium text-zinc-950">
                    <Link
                      href={`/admin/richieste/${request.id}`}
                      className="underline-offset-4 hover:underline"
                    >
                      {request.student_first_name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-zinc-700">
                    {request.student_last_name}
                  </td>
                  <td className="max-w-[260px] truncate px-4 py-3 text-zinc-700">
                    {request.school_name_snapshot}
                  </td>
                  <td className="max-w-[260px] truncate px-4 py-3 text-zinc-700">
                    {request.service_name_snapshot}
                  </td>
                  <td className="px-4 py-3">
                    <RequestStatusBadge status={request.status} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-zinc-600">
                    {formatDateTime(request.submitted_at)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/richieste/${request.id}`}
                      className="inline-flex rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:border-zinc-950 hover:text-zinc-950"
                    >
                      Apri
                    </Link>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={7}
                  className="border-t border-zinc-200 bg-zinc-50 px-4 py-6 text-sm text-zinc-600"
                >
                  Nessuna richiesta trovata con i filtri correnti.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </TableScroller>
    </TablePanel>
  );
}
