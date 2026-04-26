"use client";

import { startTransition, useDeferredValue, useState } from "react";
import { deleteSchoolAction, upsertSchoolAction } from "@/app/admin/actions";
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
  compareText,
  normalizeText,
} from "@/components/admin/admin-table-utils";
import type { Tables } from "@/lib/supabase/database.types";

type SchoolRow = Tables<"schools">;

type SortKey =
  | "short_name"
  | "full_name"
  | "school_email"
  | "teacher_name"
  | "is_active";

type SchoolsAdminTableProps = {
  schools: SchoolRow[];
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

export function SchoolsAdminTable({ schools }: SchoolsAdminTableProps) {
  const [editor, setEditor] = useState<EditorState>(null);
  const [shortNameFilter, setShortNameFilter] = useState("");
  const [fullNameFilter, setFullNameFilter] = useState("");
  const [schoolEmailFilter, setSchoolEmailFilter] = useState("");
  const [teacherFilter, setTeacherFilter] = useState("");
  const [deliveryFilter, setDeliveryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("short_name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const deferredShortNameFilter = useDeferredValue(shortNameFilter);
  const deferredFullNameFilter = useDeferredValue(fullNameFilter);
  const deferredSchoolEmailFilter = useDeferredValue(schoolEmailFilter);
  const deferredTeacherFilter = useDeferredValue(teacherFilter);

  const editingSchool =
    editor?.mode === "edit"
      ? schools.find((school) => school.id === editor.id) ?? null
      : null;

  const isEditorOpen =
    editor?.mode === "create" ||
    (editor?.mode === "edit" && editingSchool !== null);

  const visibleSchools = schools
    .filter((school) => {
      if (
        deferredShortNameFilter &&
        !normalizeText(school.short_name).includes(
          normalizeText(deferredShortNameFilter),
        )
      ) {
        return false;
      }

      if (
        deferredFullNameFilter &&
        !normalizeText(school.full_name).includes(
          normalizeText(deferredFullNameFilter),
        )
      ) {
        return false;
      }

      if (
        deferredSchoolEmailFilter &&
        !normalizeText(school.school_email).includes(
          normalizeText(deferredSchoolEmailFilter),
        )
      ) {
        return false;
      }

      if (
        deferredTeacherFilter &&
        ![
          normalizeText(school.teacher_name),
          normalizeText(school.teacher_email),
        ].some((value) => value.includes(normalizeText(deferredTeacherFilter)))
      ) {
        return false;
      }

      if (
        deliveryFilter === "school" &&
        !school.send_certificate_to_school_by_default
      ) {
        return false;
      }

      if (
        deliveryFilter === "teacher" &&
        !school.send_certificate_to_teacher_by_default
      ) {
        return false;
      }

      if (
        deliveryFilter === "none" &&
        (school.send_certificate_to_school_by_default ||
          school.send_certificate_to_teacher_by_default)
      ) {
        return false;
      }

      if (statusFilter === "active" && !school.is_active) {
        return false;
      }

      if (statusFilter === "inactive" && school.is_active) {
        return false;
      }

      return true;
    })
    .toSorted((left, right) => {
      switch (sortKey) {
        case "full_name":
          return compareText(left.full_name, right.full_name, sortDirection);
        case "school_email":
          return compareText(
            left.school_email,
            right.school_email,
            sortDirection,
          );
        case "teacher_name":
          return compareText(
            left.teacher_name,
            right.teacher_name,
            sortDirection,
          );
        case "is_active":
          return compareText(
            left.is_active ? "1" : "0",
            right.is_active ? "1" : "0",
            sortDirection,
          );
        case "short_name":
        default:
          return compareText(left.short_name, right.short_name, sortDirection);
      }
    });

  const totalSchools = schools.length;
  const activeSchools = schools.filter((school) => school.is_active).length;
  const schoolsWithEmail = schools.filter((school) => school.school_email).length;
  const schoolsWithTeacher = schools.filter(
    (school) => school.teacher_name || school.teacher_email,
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
      setShortNameFilter("");
      setFullNameFilter("");
      setSchoolEmailFilter("");
      setTeacherFilter("");
      setDeliveryFilter("all");
      setStatusFilter("all");
    });
  }

  return (
    <>
      <TablePanel
        title="Anagrafica scuole"
        metrics={[
          { label: "totali", value: String(totalSchools) },
          { label: "attive", value: String(activeSchools) },
          { label: "con email scuola", value: String(schoolsWithEmail) },
          { label: "con referente", value: String(schoolsWithTeacher) },
        ]}
        action={
          <button
            type="button"
            onClick={() => setEditor({ mode: "create" })}
            className="rounded-full bg-zinc-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-800"
          >
            Nuova scuola
          </button>
        }
      >
        <TableScroller>
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-zinc-50 text-zinc-700">
              <tr>
                <th className="px-4 py-3">
                  <SortableHeaderButton
                    label="Nome breve"
                    isActive={sortKey === "short_name"}
                    direction={sortDirection}
                    onClick={() => toggleSort("short_name")}
                  />
                </th>
                <th className="px-4 py-3">
                  <SortableHeaderButton
                    label="Nome formale"
                    isActive={sortKey === "full_name"}
                    direction={sortDirection}
                    onClick={() => toggleSort("full_name")}
                  />
                </th>
                <th className="px-4 py-3">
                  <SortableHeaderButton
                    label="Email scuola"
                    isActive={sortKey === "school_email"}
                    direction={sortDirection}
                    onClick={() => toggleSort("school_email")}
                  />
                </th>
                <th className="px-4 py-3">
                  <SortableHeaderButton
                    label="Referente"
                    isActive={sortKey === "teacher_name"}
                    direction={sortDirection}
                    onClick={() => toggleSort("teacher_name")}
                  />
                </th>
                <th className="px-4 py-3">Invio default</th>
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
                    value={shortNameFilter}
                    onChange={(event) => setShortNameFilter(event.target.value)}
                    placeholder="Cerca nome breve"
                    className="w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-xs"
                  />
                </th>
                <th className="px-2 pb-3">
                  <input
                    value={fullNameFilter}
                    onChange={(event) => setFullNameFilter(event.target.value)}
                    placeholder="Cerca nome formale"
                    className="w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-xs"
                  />
                </th>
                <th className="px-2 pb-3">
                  <input
                    value={schoolEmailFilter}
                    onChange={(event) => setSchoolEmailFilter(event.target.value)}
                    placeholder="Filtro email scuola"
                    className="w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-xs"
                  />
                </th>
                <th className="px-2 pb-3">
                  <input
                    value={teacherFilter}
                    onChange={(event) => setTeacherFilter(event.target.value)}
                    placeholder="Nome o email referente"
                    className="w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-xs"
                  />
                </th>
                <th className="px-2 pb-3">
                  <select
                    value={deliveryFilter}
                    onChange={(event) => setDeliveryFilter(event.target.value)}
                    className="w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-xs"
                  >
                    <option value="all">Tutti</option>
                    <option value="school">Invio scuola</option>
                    <option value="teacher">Invio docente</option>
                    <option value="none">Nessun invio</option>
                  </select>
                </th>
                <th className="px-2 pb-3">
                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                    className="w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-xs"
                  >
                    <option value="all">Tutti</option>
                    <option value="active">Attive</option>
                    <option value="inactive">Disattivate</option>
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
              {visibleSchools.length === 0 ? (
                <tr>
                  <td className="px-4 py-5 text-zinc-500" colSpan={7}>
                    Nessuna scuola corrisponde ai filtri attivi.
                  </td>
                </tr>
              ) : (
                visibleSchools.map((school) => (
                  <tr key={school.id} className="border-t border-zinc-100">
                    <td className="px-4 py-3 font-medium text-zinc-950">
                      {school.short_name}
                    </td>
                    <td className="px-4 py-3 text-zinc-700">{school.full_name}</td>
                    <td className="px-4 py-3 text-zinc-700">
                      {school.school_email ?? "-"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-1 text-zinc-700">
                        <p>{school.teacher_name ?? "-"}</p>
                        <p className="text-xs text-zinc-500">
                          {school.teacher_email ?? "Nessuna email"}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <TableBadge
                          tone={
                            school.send_certificate_to_school_by_default
                              ? "info"
                              : "neutral"
                          }
                        >
                          Scuola:{" "}
                          {school.send_certificate_to_school_by_default
                            ? "si"
                            : "no"}
                        </TableBadge>
                        <TableBadge
                          tone={
                            school.send_certificate_to_teacher_by_default
                              ? "info"
                              : "neutral"
                          }
                        >
                          Docente:{" "}
                          {school.send_certificate_to_teacher_by_default
                            ? "si"
                            : "no"}
                        </TableBadge>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        isActive={school.is_active}
                        activeLabel="Attiva"
                        inactiveLabel="Disattivata"
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <TableActionButton
                        onClick={() => setEditor({ mode: "edit", id: school.id })}
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
        title={editor?.mode === "create" ? "Nuova scuola" : "Modifica scuola"}
        description={
          editor?.mode === "create"
            ? "Inserisci una nuova scuola nella stessa interfaccia tabellare usata per la consultazione."
            : editingSchool
              ? `${editingSchool.short_name} - ${editingSchool.full_name}`
              : undefined
        }
        onClose={() => setEditor(null)}
      >
        <form
          key={editingSchool?.id ?? "new-school"}
          action={upsertSchoolAction}
          className="space-y-5"
        >
          <input type="hidden" name="redirect_to" value="/admin/scuole" />
          {editingSchool ? (
            <input type="hidden" name="id" value={editingSchool.id} />
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <TableField label="Nome breve">
              <input
                required
                name="short_name"
                defaultValue={editingSchool?.short_name ?? ""}
                className={INPUT_CLASS_NAME}
              />
            </TableField>

            <TableField label="Nome formale">
              <input
                required
                name="full_name"
                defaultValue={editingSchool?.full_name ?? ""}
                className={INPUT_CLASS_NAME}
              />
            </TableField>

            <TableField label="Email scuola">
              <input
                type="email"
                name="school_email"
                defaultValue={editingSchool?.school_email ?? ""}
                className={INPUT_CLASS_NAME}
              />
            </TableField>

            <TableField label="Docente referente">
              <input
                name="teacher_name"
                defaultValue={editingSchool?.teacher_name ?? ""}
                className={INPUT_CLASS_NAME}
              />
            </TableField>

            <TableField label="Email docente">
              <input
                type="email"
                name="teacher_email"
                defaultValue={editingSchool?.teacher_email ?? ""}
                className={INPUT_CLASS_NAME}
              />
            </TableField>

            <TableField label="Note" className="md:col-span-2">
              <textarea
                name="notes"
                rows={4}
                defaultValue={editingSchool?.notes ?? ""}
                className={INPUT_CLASS_NAME}
              />
            </TableField>

            <TableCheckboxField
              label="Invia alla scuola per default"
              className="md:col-span-1"
            >
              <input
                type="checkbox"
                name="send_certificate_to_school_by_default"
                defaultChecked={
                  editingSchool?.send_certificate_to_school_by_default ?? true
                }
              />
            </TableCheckboxField>

            <TableCheckboxField
              label="Invia al docente per default"
              className="md:col-span-1"
            >
              <input
                type="checkbox"
                name="send_certificate_to_teacher_by_default"
                defaultChecked={
                  editingSchool?.send_certificate_to_teacher_by_default ?? true
                }
              />
            </TableCheckboxField>

            <TableCheckboxField
              label="Scuola attiva"
              className="md:col-span-2"
            >
              <input
                type="checkbox"
                name="is_active"
                defaultChecked={editingSchool?.is_active ?? true}
              />
            </TableCheckboxField>
          </div>

          <TableFormActions
            onCancel={() => setEditor(null)}
            submitLabel={editingSchool ? "Aggiorna scuola" : "Salva scuola"}
            destructiveAction={
              editingSchool
                ? {
                    label: "Elimina scuola",
                    confirmMessage:
                      "Confermi l'eliminazione della scuola? L'operazione e' irreversibile.",
                    formAction: deleteSchoolAction,
                  }
                : undefined
            }
          />
        </form>
      </TableDialog>
    </>
  );
}
