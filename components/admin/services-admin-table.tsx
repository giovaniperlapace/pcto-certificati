"use client";

import Link from "next/link";
import { startTransition, useDeferredValue, useState } from "react";
import { deleteServiceAction, upsertServiceAction } from "@/app/admin/actions";
import {
  SortableHeaderButton,
  StatusBadge,
  TableActionButton,
  TableBadge,
  TableCheckboxField,
  TableDialog,
  TableField,
  TableFormActions,
  TablePanel,
  TableScroller,
} from "@/components/admin/admin-table-pattern";
import {
  compareNumber,
  compareText,
  normalizeText,
} from "@/components/admin/admin-table-utils";
import type { Tables } from "@/lib/supabase/database.types";

type ServiceRow = Tables<"services"> & {
  assignmentCount: number;
};

type SortKey =
  | "name"
  | "weekday"
  | "schedule_label"
  | "city"
  | "assignmentCount"
  | "is_active";

type ServicesAdminTableProps = {
  services: ServiceRow[];
};

type EditorState =
  | {
      mode: "create";
    }
  | {
      mode: "edit";
      id: string;
    }
  | null;

const INPUT_CLASS_NAME =
  "w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm outline-none transition focus:border-zinc-950";

const weekdays = [
  "Lunedi",
  "Martedi",
  "Mercoledi",
  "Giovedi",
  "Venerdi",
  "Sabato",
  "Domenica",
];

export function ServicesAdminTable({
  services,
}: ServicesAdminTableProps) {
  const [editor, setEditor] = useState<EditorState>(null);
  const [nameFilter, setNameFilter] = useState("");
  const [scheduleFilter, setScheduleFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [weekdayFilter, setWeekdayFilter] = useState("");
  const [assignmentFilter, setAssignmentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const deferredNameFilter = useDeferredValue(nameFilter);
  const deferredScheduleFilter = useDeferredValue(scheduleFilter);
  const deferredCityFilter = useDeferredValue(cityFilter);

  const editingService =
    editor?.mode === "edit"
      ? services.find((service) => service.id === editor.id) ?? null
      : null;

  const visibleServices = services
    .filter((service) => {
      if (
        deferredNameFilter &&
        !normalizeText(service.name).includes(normalizeText(deferredNameFilter))
      ) {
        return false;
      }

      if (
        deferredScheduleFilter &&
        !normalizeText(service.schedule_label).includes(
          normalizeText(deferredScheduleFilter),
        )
      ) {
        return false;
      }

      if (
        deferredCityFilter &&
        ![
          normalizeText(service.city),
          normalizeText(service.address),
        ].some((value) => value.includes(normalizeText(deferredCityFilter)))
      ) {
        return false;
      }

      if (weekdayFilter && service.weekday !== weekdayFilter) {
        return false;
      }

      if (assignmentFilter === "assigned" && service.assignmentCount === 0) {
        return false;
      }

      if (assignmentFilter === "unassigned" && service.assignmentCount > 0) {
        return false;
      }

      if (statusFilter === "active" && !service.is_active) {
        return false;
      }

      if (statusFilter === "inactive" && service.is_active) {
        return false;
      }

      return true;
    })
    .toSorted((left, right) => {
      switch (sortKey) {
        case "assignmentCount":
          return compareNumber(
            left.assignmentCount,
            right.assignmentCount,
            sortDirection,
          );
        case "is_active":
          return compareNumber(
            left.is_active ? 1 : 0,
            right.is_active ? 1 : 0,
            sortDirection,
          );
        case "weekday":
          return compareText(left.weekday, right.weekday, sortDirection);
        case "schedule_label":
          return compareText(
            left.schedule_label,
            right.schedule_label,
            sortDirection,
          );
        case "city":
          return compareText(left.city, right.city, sortDirection);
        case "name":
        default:
          return compareText(left.name, right.name, sortDirection);
      }
    });

  const totalServices = services.length;
  const activeServices = services.filter((service) => service.is_active).length;
  const servicesWithCoordinators = services.filter(
    (service) => service.assignmentCount > 0,
  ).length;

  function toggleSort(nextKey: SortKey) {
    if (sortKey === nextKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(nextKey);
    setSortDirection("asc");
  }

  function resetFilters() {
    startTransition(() => {
      setNameFilter("");
      setScheduleFilter("");
      setCityFilter("");
      setWeekdayFilter("");
      setAssignmentFilter("all");
      setStatusFilter("all");
    });
  }

  return (
    <>
      <TablePanel
        title="Anagrafica servizi"
        description="Vista, modifica e inserimento ora passano da una tabella unica con filtri rapidi, mantenendo separata la pagina dedicata per i collegamenti con i coordinatori."
        metrics={[
          { label: "totali", value: String(totalServices) },
          { label: "attivi", value: String(activeServices) },
          { label: "con coordinatori", value: String(servicesWithCoordinators) },
        ]}
        action={
          <button
            type="button"
            onClick={() => setEditor({ mode: "create" })}
            className="rounded-full bg-zinc-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-800"
          >
            Nuovo servizio
          </button>
        }
      >
        <TableScroller>
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-zinc-50 text-zinc-700">
              <tr>
                <th className="px-4 py-3">
                  <SortableHeaderButton
                    label="Servizio"
                    isActive={sortKey === "name"}
                    direction={sortDirection}
                    onClick={() => toggleSort("name")}
                  />
                </th>
                <th className="px-4 py-3">
                  <SortableHeaderButton
                    label="Giorno"
                    isActive={sortKey === "weekday"}
                    direction={sortDirection}
                    onClick={() => toggleSort("weekday")}
                  />
                </th>
                <th className="px-4 py-3">
                  <SortableHeaderButton
                    label="Orario"
                    isActive={sortKey === "schedule_label"}
                    direction={sortDirection}
                    onClick={() => toggleSort("schedule_label")}
                  />
                </th>
                <th className="px-4 py-3">
                  <SortableHeaderButton
                    label="Luogo"
                    isActive={sortKey === "city"}
                    direction={sortDirection}
                    onClick={() => toggleSort("city")}
                  />
                </th>
                <th className="px-4 py-3">
                  <SortableHeaderButton
                    label="Coordinatori"
                    isActive={sortKey === "assignmentCount"}
                    direction={sortDirection}
                    onClick={() => toggleSort("assignmentCount")}
                  />
                </th>
                <th className="px-4 py-3">
                  <SortableHeaderButton
                    label="Stato"
                    isActive={sortKey === "is_active"}
                    direction={sortDirection}
                    onClick={() => toggleSort("is_active")}
                  />
                </th>
                <th className="px-4 py-3 text-right">Azioni</th>
              </tr>
              <tr>
                <th className="px-2 pb-3">
                  <input
                    value={nameFilter}
                    onChange={(event) => setNameFilter(event.target.value)}
                    placeholder="Cerca servizio"
                    className="w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-xs"
                  />
                </th>
                <th className="px-2 pb-3">
                  <select
                    value={weekdayFilter}
                    onChange={(event) => setWeekdayFilter(event.target.value)}
                    className="w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-xs"
                  >
                    <option value="">Tutti</option>
                    {weekdays.map((day) => (
                      <option key={day} value={day}>
                        {day}
                      </option>
                    ))}
                  </select>
                </th>
                <th className="px-2 pb-3">
                  <input
                    value={scheduleFilter}
                    onChange={(event) => setScheduleFilter(event.target.value)}
                    placeholder="Filtro orario"
                    className="w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-xs"
                  />
                </th>
                <th className="px-2 pb-3">
                  <input
                    value={cityFilter}
                    onChange={(event) => setCityFilter(event.target.value)}
                    placeholder="Citta o indirizzo"
                    className="w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-xs"
                  />
                </th>
                <th className="px-2 pb-3">
                  <select
                    value={assignmentFilter}
                    onChange={(event) => setAssignmentFilter(event.target.value)}
                    className="w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-xs"
                  >
                    <option value="all">Tutti</option>
                    <option value="assigned">Con coordinatori</option>
                    <option value="unassigned">Senza coordinatori</option>
                  </select>
                </th>
                <th className="px-2 pb-3">
                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                    className="w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-xs"
                  >
                    <option value="all">Tutti</option>
                    <option value="active">Attivi</option>
                    <option value="inactive">Disattivati</option>
                  </select>
                </th>
                <th className="px-2 pb-3 text-right">
                  <TableActionButton onClick={resetFilters}>
                    Reset
                  </TableActionButton>
                </th>
              </tr>
            </thead>
            <tbody>
              {visibleServices.length === 0 ? (
                <tr>
                  <td className="px-4 py-5 text-zinc-500" colSpan={7}>
                    Nessun servizio corrisponde ai filtri attivi.
                  </td>
                </tr>
              ) : (
                visibleServices.map((service) => (
                  <tr key={service.id} className="border-t border-zinc-100">
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        <p className="font-medium text-zinc-950">{service.name}</p>
                        {service.certificate_label ? (
                          <p className="text-xs text-zinc-500">
                            Certificato: {service.certificate_label}
                          </p>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-zinc-700">{service.weekday}</td>
                    <td className="px-4 py-3 text-zinc-700">
                      {service.schedule_label}
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-1 text-zinc-700">
                        <p>{service.city}</p>
                        <p className="text-xs text-zinc-500">{service.address}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <TableBadge
                        tone={service.assignmentCount > 0 ? "info" : "warning"}
                      >
                        {service.assignmentCount} collegati
                      </TableBadge>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        isActive={service.is_active}
                        activeLabel="Attivo"
                        inactiveLabel="Disattivato"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <TableActionButton
                          onClick={() =>
                            setEditor({ mode: "edit", id: service.id })
                          }
                        >
                          Modifica
                        </TableActionButton>
                        <Link
                          href={`/admin/servizi/${service.id}`}
                          className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:border-zinc-950 hover:text-zinc-950"
                        >
                          Coordinatori
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </TableScroller>
      </TablePanel>

      <TableDialog
        open={editor !== null}
        title={editor?.mode === "create" ? "Nuovo servizio" : "Modifica servizio"}
        description={
          editor?.mode === "create"
            ? "Inserisci il servizio nella stessa struttura usata nella tabella. Potrai poi aprire la pagina dedicata per collegare i coordinatori."
            : editingService
              ? editingService.name
              : undefined
        }
        onClose={() => setEditor(null)}
      >
        <form
          key={editingService?.id ?? "new-service"}
          action={upsertServiceAction}
          className="space-y-5"
        >
          <input type="hidden" name="redirect_to" value="/admin/servizi" />
          {editingService ? (
            <input type="hidden" name="id" value={editingService.id} />
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <TableField label="Nome servizio">
              <input
                required
                name="name"
                defaultValue={editingService?.name ?? ""}
                className={INPUT_CLASS_NAME}
              />
            </TableField>

            <TableField label="Giorno">
              <select
                required
                name="weekday"
                defaultValue={editingService?.weekday ?? "Lunedi"}
                className={INPUT_CLASS_NAME}
              >
                {weekdays.map((day) => (
                  <option key={day} value={day}>
                    {day}
                  </option>
                ))}
              </select>
            </TableField>

            <TableField label="Ora inizio">
              <input
                type="time"
                name="start_time"
                defaultValue={editingService?.start_time ?? ""}
                className={INPUT_CLASS_NAME}
              />
            </TableField>

            <TableField label="Ora fine">
              <input
                type="time"
                name="end_time"
                defaultValue={editingService?.end_time ?? ""}
                className={INPUT_CLASS_NAME}
              />
            </TableField>

            <TableField label="Etichetta orario">
              <input
                required
                name="schedule_label"
                defaultValue={editingService?.schedule_label ?? ""}
                placeholder="Mercoledi 16:30 - 18:30"
                className={INPUT_CLASS_NAME}
              />
            </TableField>

            <TableField label="Citta">
              <input
                required
                name="city"
                defaultValue={editingService?.city ?? "Roma"}
                className={INPUT_CLASS_NAME}
              />
            </TableField>

            <TableField label="Indirizzo" className="md:col-span-2">
              <input
                required
                name="address"
                defaultValue={editingService?.address ?? ""}
                className={INPUT_CLASS_NAME}
              />
            </TableField>

            <TableField label="Etichetta certificato" className="md:col-span-2">
              <input
                name="certificate_label"
                defaultValue={editingService?.certificate_label ?? ""}
                className={INPUT_CLASS_NAME}
              />
            </TableField>

            <TableCheckboxField
              label="Servizio attivo"
              description="Ricordati di collegare almeno un coordinatore attivo prima di lasciarlo disponibile nel flusso pubblico."
              className="md:col-span-2"
            >
              <input
                type="checkbox"
                name="is_active"
                defaultChecked={editingService?.is_active ?? false}
              />
            </TableCheckboxField>
          </div>

          <TableFormActions
            onCancel={() => setEditor(null)}
            submitLabel={
              editingService ? "Aggiorna servizio" : "Salva servizio"
            }
            destructiveAction={
              editingService
                ? {
                    label: "Elimina servizio",
                    confirmMessage:
                      "Confermi l'eliminazione del servizio? L'operazione e' irreversibile.",
                    formAction: deleteServiceAction,
                  }
                : undefined
            }
          />
        </form>
      </TableDialog>
    </>
  );
}
