"use client";

import { startTransition, useDeferredValue, useState } from "react";
import {
  deleteCoordinatorAction,
  upsertCoordinatorAction,
} from "@/app/admin/actions";
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

type CoordinatorRow = Tables<"coordinators"> & {
  assignedServicesCount: number;
  grantAdminAccess: boolean;
};

type SortKey =
  | "first_name"
  | "last_name"
  | "email"
  | "phone"
  | "assignedServicesCount"
  | "grantAdminAccess"
  | "is_active";

type CoordinatorsAdminTableProps = {
  coordinators: CoordinatorRow[];
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

export function CoordinatorsAdminTable({
  coordinators,
}: CoordinatorsAdminTableProps) {
  const [editor, setEditor] = useState<EditorState>(null);
  const [firstNameFilter, setFirstNameFilter] = useState("");
  const [lastNameFilter, setLastNameFilter] = useState("");
  const [emailFilter, setEmailFilter] = useState("");
  const [phoneFilter, setPhoneFilter] = useState("");
  const [assignmentFilter, setAssignmentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("last_name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const deferredFirstNameFilter = useDeferredValue(firstNameFilter);
  const deferredLastNameFilter = useDeferredValue(lastNameFilter);
  const deferredEmailFilter = useDeferredValue(emailFilter);
  const deferredPhoneFilter = useDeferredValue(phoneFilter);

  const editingCoordinator =
    editor?.mode === "edit"
      ? coordinators.find((coordinator) => coordinator.id === editor.id) ?? null
      : null;

  const isEditorOpen =
    editor?.mode === "create" ||
    (editor?.mode === "edit" && editingCoordinator !== null);

  const visibleCoordinators = coordinators
    .filter((coordinator) => {
      if (
        deferredFirstNameFilter &&
        !normalizeText(coordinator.first_name).includes(
          normalizeText(deferredFirstNameFilter),
        )
      ) {
        return false;
      }

      if (
        deferredLastNameFilter &&
        !normalizeText(coordinator.last_name).includes(
          normalizeText(deferredLastNameFilter),
        )
      ) {
        return false;
      }

      if (
        deferredEmailFilter &&
        !normalizeText(coordinator.email).includes(
          normalizeText(deferredEmailFilter),
        )
      ) {
        return false;
      }

      if (
        deferredPhoneFilter &&
        !normalizeText(coordinator.phone).includes(
          normalizeText(deferredPhoneFilter),
        )
      ) {
        return false;
      }

      if (
        assignmentFilter === "assigned" &&
        coordinator.assignedServicesCount === 0
      ) {
        return false;
      }

      if (
        assignmentFilter === "unassigned" &&
        coordinator.assignedServicesCount > 0
      ) {
        return false;
      }

      if (statusFilter === "active" && !coordinator.is_active) {
        return false;
      }

      if (statusFilter === "inactive" && coordinator.is_active) {
        return false;
      }

      return true;
    })
    .toSorted((left, right) => {
      switch (sortKey) {
        case "first_name":
          return compareText(
            left.first_name,
            right.first_name,
            sortDirection,
          );
        case "email":
          return compareText(left.email, right.email, sortDirection);
        case "phone":
          return compareText(left.phone, right.phone, sortDirection);
        case "assignedServicesCount":
          return compareNumber(
            left.assignedServicesCount,
            right.assignedServicesCount,
            sortDirection,
          );
        case "grantAdminAccess":
          return compareNumber(
            left.grantAdminAccess ? 1 : 0,
            right.grantAdminAccess ? 1 : 0,
            sortDirection,
          );
        case "is_active":
          return compareNumber(
            left.is_active ? 1 : 0,
            right.is_active ? 1 : 0,
            sortDirection,
          );
        case "last_name":
        default:
          return compareText(left.last_name, right.last_name, sortDirection);
      }
    });

  const totalCoordinators = coordinators.length;
  const activeCoordinators = coordinators.filter(
    (coordinator) => coordinator.is_active,
  ).length;
  const linkedCoordinators = coordinators.filter(
    (coordinator) => coordinator.assignedServicesCount > 0,
  ).length;
  const adminEnabledCoordinators = coordinators.filter(
    (coordinator) => coordinator.grantAdminAccess,
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
      setFirstNameFilter("");
      setLastNameFilter("");
      setEmailFilter("");
      setPhoneFilter("");
      setAssignmentFilter("all");
      setStatusFilter("all");
    });
  }

  return (
    <>
      <TablePanel
        title="Anagrafica coordinatori"
        description="La gestione dei coordinatori adesso segue lo stesso pattern tabellare del progetto di riferimento, con evidenza immediata di attivazione e collegamenti ai servizi."
        metrics={[
          { label: "totali", value: String(totalCoordinators) },
          { label: "attivi", value: String(activeCoordinators) },
          { label: "collegati a servizi", value: String(linkedCoordinators) },
          { label: "anche admin", value: String(adminEnabledCoordinators) },
        ]}
        action={
          <button
            type="button"
            onClick={() => setEditor({ mode: "create" })}
            className="rounded-full bg-zinc-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-800"
          >
            Nuovo coordinatore
          </button>
        }
      >
        <TableScroller>
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-zinc-50 text-zinc-700">
              <tr>
                <th className="px-4 py-3">
                  <SortableHeaderButton
                    label="Nome"
                    isActive={sortKey === "first_name"}
                    direction={sortDirection}
                    onClick={() => toggleSort("first_name")}
                  />
                </th>
                <th className="px-4 py-3">
                  <SortableHeaderButton
                    label="Cognome"
                    isActive={sortKey === "last_name"}
                    direction={sortDirection}
                    onClick={() => toggleSort("last_name")}
                  />
                </th>
                <th className="px-4 py-3">
                  <SortableHeaderButton
                    label="Email"
                    isActive={sortKey === "email"}
                    direction={sortDirection}
                    onClick={() => toggleSort("email")}
                  />
                </th>
                <th className="px-4 py-3">
                  <SortableHeaderButton
                    label="Telefono"
                    isActive={sortKey === "phone"}
                    direction={sortDirection}
                    onClick={() => toggleSort("phone")}
                  />
                </th>
                <th className="px-4 py-3">
                  <SortableHeaderButton
                    label="Servizi"
                    isActive={sortKey === "assignedServicesCount"}
                    direction={sortDirection}
                    onClick={() => toggleSort("assignedServicesCount")}
                  />
                </th>
                <th className="px-4 py-3">
                  <SortableHeaderButton
                    label="Accesso"
                    isActive={sortKey === "grantAdminAccess"}
                    direction={sortDirection}
                    onClick={() => toggleSort("grantAdminAccess")}
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
                    value={emailFilter}
                    onChange={(event) => setEmailFilter(event.target.value)}
                    placeholder="Filtro email"
                    className="w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-xs"
                  />
                </th>
                <th className="px-2 pb-3">
                  <input
                    value={phoneFilter}
                    onChange={(event) => setPhoneFilter(event.target.value)}
                    placeholder="Filtro telefono"
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
                    <option value="assigned">Con servizi</option>
                    <option value="unassigned">Senza servizi</option>
                  </select>
                </th>
                <th className="px-2 pb-3">
                  <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1.5 text-xs text-zinc-600">
                    Coordinatore / Admin
                  </div>
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
              {visibleCoordinators.length === 0 ? (
                <tr>
                  <td className="px-4 py-5 text-zinc-500" colSpan={8}>
                    Nessun coordinatore corrisponde ai filtri attivi.
                  </td>
                </tr>
              ) : (
                visibleCoordinators.map((coordinator) => (
                  <tr key={coordinator.id} className="border-t border-zinc-100">
                    <td className="px-4 py-3 font-medium text-zinc-950">
                      {coordinator.first_name}
                    </td>
                    <td className="px-4 py-3 text-zinc-700">
                      {coordinator.last_name}
                    </td>
                    <td className="px-4 py-3 text-zinc-700">
                      {coordinator.email}
                    </td>
                    <td className="px-4 py-3 text-zinc-700">
                      {coordinator.phone ?? "-"}
                    </td>
                    <td className="px-4 py-3">
                      <TableBadge
                        tone={
                          coordinator.assignedServicesCount > 0
                            ? "info"
                            : "warning"
                        }
                      >
                        {coordinator.assignedServicesCount} servizi
                      </TableBadge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <TableBadge tone="info">Coordinatore</TableBadge>
                        {coordinator.grantAdminAccess ? (
                          <TableBadge tone="positive">Admin</TableBadge>
                        ) : null}
                        {coordinator.auth_user_id ? (
                          <TableBadge tone="neutral">Magic Link pronto</TableBadge>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        isActive={coordinator.is_active}
                        activeLabel="Attivo"
                        inactiveLabel="Disattivato"
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <TableActionButton
                        onClick={() =>
                          setEditor({ mode: "edit", id: coordinator.id })
                        }
                      >
                        Modifica
                      </TableActionButton>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </TableScroller>
      </TablePanel>

      <TableDialog
        open={isEditorOpen}
        title={
          editor?.mode === "create"
            ? "Nuovo coordinatore"
            : "Modifica coordinatore"
        }
        description={
          editor?.mode === "create"
            ? "Inserisci il coordinatore e poi potrai collegarlo ai servizi dalle schermate dedicate."
            : editingCoordinator
              ? `${editingCoordinator.first_name} ${editingCoordinator.last_name}`
              : undefined
        }
        onClose={() => setEditor(null)}
        widthClassName="max-w-3xl"
      >
        <form
          key={editingCoordinator?.id ?? "new-coordinator"}
          action={upsertCoordinatorAction}
          className="space-y-5"
        >
          <input type="hidden" name="redirect_to" value="/admin/coordinatori" />
          {editingCoordinator ? (
            <input type="hidden" name="id" value={editingCoordinator.id} />
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <TableField label="Nome">
              <input
                required
                name="first_name"
                defaultValue={editingCoordinator?.first_name ?? ""}
                className={INPUT_CLASS_NAME}
              />
            </TableField>

            <TableField label="Cognome">
              <input
                required
                name="last_name"
                defaultValue={editingCoordinator?.last_name ?? ""}
                className={INPUT_CLASS_NAME}
              />
            </TableField>

            <TableField label="Email">
              <input
                required
                type="email"
                name="email"
                defaultValue={editingCoordinator?.email ?? ""}
                className={INPUT_CLASS_NAME}
              />
            </TableField>

            <TableField label="Telefono">
              <input
                name="phone"
                defaultValue={editingCoordinator?.phone ?? ""}
                className={INPUT_CLASS_NAME}
              />
            </TableField>

            <TableCheckboxField
              label="Coordinatore attivo"
              description="Mantieni attivi solo i coordinatori che devono continuare a usare il Magic Link e gestire le richieste."
              className="md:col-span-2"
            >
              <input
                type="checkbox"
                name="is_active"
                defaultChecked={editingCoordinator?.is_active ?? true}
              />
            </TableCheckboxField>

            <TableCheckboxField
              label="Abilita anche l'accesso admin"
              description="Promuove il coordinatore ad admin e prepara automaticamente l'utente auth usato dal Magic Link."
              className="md:col-span-2"
            >
              <input
                type="checkbox"
                name="grant_admin_access"
                defaultChecked={editingCoordinator?.grantAdminAccess ?? false}
              />
            </TableCheckboxField>
          </div>

          <TableFormActions
            onCancel={() => setEditor(null)}
            submitLabel={
              editingCoordinator
                ? "Aggiorna coordinatore"
                : "Salva coordinatore"
            }
            destructiveAction={
              editingCoordinator
                ? {
                    label: "Elimina coordinatore",
                    confirmMessage:
                      "Confermi l'eliminazione del coordinatore? L'operazione e' irreversibile.",
                    formAction: deleteCoordinatorAction,
                  }
                : undefined
            }
          />
        </form>
      </TableDialog>
    </>
  );
}
