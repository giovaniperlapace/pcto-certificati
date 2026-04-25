"use client";

import type { FormEvent } from "react";
import { startTransition, useDeferredValue, useState } from "react";
import {
  createCertificateRequestFromPctoStudentAction,
  updatePctoStudentRegistrationAction,
} from "@/app/coordinatore/pcto/actions";
import {
  SortableHeaderButton,
  TableActionButton,
  TableBadge,
  TableCheckboxField,
  TableDialog,
  TableField,
  TableFormActions,
  TablePanel,
  TableScroller,
} from "@/components/admin/admin-table-pattern";
import { PendingSubmitButton } from "@/components/ui/pending-submit-button";
import {
  compareNumber,
  compareText,
  normalizeText,
} from "@/components/admin/admin-table-utils";
import type { Tables } from "@/lib/supabase/database.types";

type PctoStudentRow = Tables<"pcto_student_registrations">;

type PctoStudentsTableProps = {
  assignedServiceNames: string[];
  students: PctoStudentRow[];
};

type SortKey =
  | "source_row_number"
  | "student_first_name"
  | "student_last_name"
  | "school_name"
  | "class_label"
  | "registration_status"
  | "attendance_count";

type EditorState = {
  id: string;
  mode: "view" | "edit";
} | null;

type BadgeTone = "neutral" | "positive" | "warning" | "info";

const INPUT_CLASS_NAME =
  "w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm outline-none transition focus:border-zinc-950";

function formatClassLabel(student: PctoStudentRow) {
  return [student.class_year, student.class_section]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(" ") || "-";
}

function formatBoolean(value: boolean | null) {
  if (value === true) return "Si";
  if (value === false) return "No";
  return "-";
}

function getRegistrationStatusTone(status: string | null): BadgeTone {
  const normalized = normalizeText(status);

  if (normalized.includes("assegnat")) {
    return "positive";
  }

  return "info";
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("it-IT", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function studentSearchText(student: PctoStudentRow) {
  return [
    String(student.source_row_number),
    student.student_first_name,
    student.student_last_name,
    student.school_name,
    formatClassLabel(student),
    student.registration_status,
    student.assigned_service_name,
    student.student_email,
    student.student_phone,
  ].join(" ");
}

function canCreateCertificateRequest(student: PctoStudentRow) {
  return normalizeText(student.registration_status) !== "concluso";
}

function getCertificateButtonClassName(student: PctoStudentRow) {
  const baseClassName =
    "rounded-lg border px-3 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50";

  if ((student.attendance_count ?? 0) <= 0) {
    return `${baseClassName} border-amber-200 bg-amber-50 text-amber-700 hover:border-amber-700 hover:text-amber-800`;
  }

  return `${baseClassName} border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-700 hover:text-emerald-800`;
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
      <dt className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-500">
        {label}
      </dt>
      <dd className="mt-1 break-words text-sm text-zinc-900">
        {value ?? "-"}
      </dd>
    </div>
  );
}

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-500">
        {title}
      </h4>
      <dl className="grid gap-3 md:grid-cols-2">{children}</dl>
    </section>
  );
}

export function PctoStudentsTable({
  assignedServiceNames,
  students,
}: PctoStudentsTableProps) {
  const [editor, setEditor] = useState<EditorState>(null);
  const [searchFilter, setSearchFilter] = useState("");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("student_last_name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const deferredSearchFilter = useDeferredValue(searchFilter);

  const selectedStudent = editor
    ? students.find((student) => student.id === editor.id) ?? null
    : null;
  const isEditorOpen = Boolean(editor && selectedStudent);

  const statusOptions = Array.from(
    new Set(
      students
        .map((student) => student.registration_status)
        .filter((status): status is string => Boolean(status)),
    ),
  ).sort((left, right) => left.localeCompare(right, "it"));

  const visibleStudents = students
    .filter((student) => {
      if (
        deferredSearchFilter &&
        !normalizeText(studentSearchText(student)).includes(
          normalizeText(deferredSearchFilter),
        )
      ) {
        return false;
      }

      if (
        serviceFilter !== "all" &&
        student.assigned_service_name !== serviceFilter
      ) {
        return false;
      }

      if (statusFilter !== "all" && student.registration_status !== statusFilter) {
        return false;
      }

      return true;
    })
    .toSorted((left, right) => {
      switch (sortKey) {
        case "source_row_number":
          return compareNumber(
            left.source_row_number,
            right.source_row_number,
            sortDirection,
          );
        case "student_first_name":
          return compareText(
            left.student_first_name,
            right.student_first_name,
            sortDirection,
          );
        case "school_name":
          return compareText(left.school_name, right.school_name, sortDirection);
        case "class_label":
          return compareText(
            formatClassLabel(left),
            formatClassLabel(right),
            sortDirection,
          );
        case "registration_status":
          return compareText(
            left.registration_status,
            right.registration_status,
            sortDirection,
          );
        case "attendance_count":
          return compareNumber(
            left.attendance_count ?? 0,
            right.attendance_count ?? 0,
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

  const studentsWithAttendance = students.filter(
    (student) => (student.attendance_count ?? 0) > 0,
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
      setSearchFilter("");
      setServiceFilter("all");
      setStatusFilter("all");
    });
  }

  function confirmCertificateRequest(
    event: FormEvent<HTMLFormElement>,
    student: PctoStudentRow,
  ) {
    const attendanceCount = student.attendance_count ?? 0;
    const hours = attendanceCount > 0 ? attendanceCount * 4 : 20;
    const isConfirmed = window.confirm(
      `Creare una richiesta PCTO per ${student.student_first_name} ${student.student_last_name} con ${hours} ore?`,
    );

    if (!isConfirmed) {
      event.preventDefault();
    }
  }

  return (
    <>
      <TablePanel
        title="Studenti PCTO"
        description="Elenco degli studenti importati dal Google Fogli e assegnati ai servizi collegati a questo coordinatore."
        metrics={[
          { label: "studenti visibili", value: String(students.length) },
          { label: "con presenze", value: String(studentsWithAttendance) },
          { label: "servizi collegati", value: String(assignedServiceNames.length) },
        ]}
      >
        <div className="mb-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_220px_auto]">
          <input
            value={searchFilter}
            onChange={(event) => setSearchFilter(event.target.value)}
            placeholder="Cerca per nome, scuola, classe, servizio, email..."
            className={INPUT_CLASS_NAME}
          />
          <select
            value={serviceFilter}
            onChange={(event) => setServiceFilter(event.target.value)}
            className={INPUT_CLASS_NAME}
          >
            <option value="all">Tutti i servizi</option>
            {assignedServiceNames.map((serviceName) => (
              <option key={serviceName} value={serviceName}>
                {serviceName}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className={INPUT_CLASS_NAME}
          >
            <option value="all">Tutti gli stati</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={resetFilters}
            className="rounded-full border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-700 transition hover:border-zinc-950 hover:text-zinc-950"
          >
            Azzera filtri
          </button>
        </div>

        <TableScroller>
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-zinc-50 text-zinc-700">
              <tr>
                <th className="px-4 py-3">
                  <SortableHeaderButton
                    label="ID"
                    isActive={sortKey === "source_row_number"}
                    direction={sortDirection}
                    onClick={() => toggleSort("source_row_number")}
                  />
                </th>
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
                    isActive={sortKey === "school_name"}
                    direction={sortDirection}
                    onClick={() => toggleSort("school_name")}
                  />
                </th>
                <th className="px-4 py-3">
                  <SortableHeaderButton
                    label="Classe"
                    isActive={sortKey === "class_label"}
                    direction={sortDirection}
                    onClick={() => toggleSort("class_label")}
                  />
                </th>
                <th className="px-4 py-3">
                  <SortableHeaderButton
                    label="Stato"
                    isActive={sortKey === "registration_status"}
                    direction={sortDirection}
                    onClick={() => toggleSort("registration_status")}
                  />
                </th>
                <th className="px-4 py-3">
                  <SortableHeaderButton
                    label="Presenze registrate"
                    isActive={sortKey === "attendance_count"}
                    direction={sortDirection}
                    onClick={() => toggleSort("attendance_count")}
                  />
                </th>
                <th className="px-4 py-3 text-right">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {visibleStudents.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-8 text-center text-sm text-zinc-500"
                  >
                    Nessuno studente PCTO corrisponde ai filtri attivi.
                  </td>
                </tr>
              ) : (
                visibleStudents.map((student) => (
                  <tr key={student.id} className="align-top">
                    <td className="px-4 py-3 font-mono text-xs text-zinc-600">
                      {student.source_row_number}
                    </td>
                    <td className="px-4 py-3 font-medium text-zinc-950">
                      {student.student_first_name}
                    </td>
                    <td className="px-4 py-3 font-medium text-zinc-950">
                      {student.student_last_name}
                    </td>
                    <td className="max-w-[260px] px-4 py-3 text-zinc-700">
                      <span className="line-clamp-2">{student.school_name ?? "-"}</span>
                    </td>
                    <td className="px-4 py-3 text-zinc-700">
                      {formatClassLabel(student)}
                    </td>
                    <td className="px-4 py-3">
                      <TableBadge
                        tone={getRegistrationStatusTone(student.registration_status)}
                      >
                        {student.registration_status ?? "Senza stato"}
                      </TableBadge>
                    </td>
                    <td className="px-4 py-3 text-zinc-700">
                      {student.attendance_count ?? 0}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap justify-end gap-2">
                        <form
                          action={createCertificateRequestFromPctoStudentAction}
                          onSubmit={(event) =>
                            confirmCertificateRequest(event, student)
                          }
                        >
                          <input type="hidden" name="id" value={student.id} />
                          <input
                            type="hidden"
                            name="redirect_to"
                            value="/coordinatore/pcto"
                          />
                          <PendingSubmitButton
                            disabled={!canCreateCertificateRequest(student)}
                            className={getCertificateButtonClassName(student)}
                            idleLabel="Certificato"
                            pendingLabel="Creo..."
                            pendingLabelMode="clicked"
                            title={
                              canCreateCertificateRequest(student)
                                ? "Crea una richiesta certificato PCTO"
                                : "Lo studente risulta gia' concluso"
                            }
                          />
                        </form>
                        <TableActionButton
                          onClick={() =>
                            setEditor({ id: student.id, mode: "view" })
                          }
                        >
                          Apri scheda
                        </TableActionButton>
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
        open={isEditorOpen}
        title={
          selectedStudent
            ? `${selectedStudent.student_first_name} ${selectedStudent.student_last_name}`
            : "Scheda studente"
        }
        description={
          selectedStudent
            ? `ID ${selectedStudent.source_row_number} - ${selectedStudent.school_name ?? "scuola non indicata"}`
            : undefined
        }
        onClose={() => setEditor(null)}
        widthClassName="max-w-5xl"
      >
        {selectedStudent && editor?.mode === "view" ? (
          <div className="space-y-6">
            <div className="flex justify-end">
              <TableActionButton
                onClick={() =>
                  setEditor({ id: selectedStudent.id, mode: "edit" })
                }
              >
                Modifica dati
              </TableActionButton>
            </div>

            <DetailSection title="Dati principali">
              <DetailItem label="ID import" value={selectedStudent.source_row_number} />
              <DetailItem label="Nome" value={selectedStudent.student_first_name} />
              <DetailItem label="Cognome" value={selectedStudent.student_last_name} />
              <DetailItem label="Nome visualizzato" value={selectedStudent.display_name} />
              <DetailItem label="Scuola" value={selectedStudent.school_name} />
              <DetailItem label="Classe" value={formatClassLabel(selectedStudent)} />
              <DetailItem label="Stato" value={selectedStudent.registration_status} />
              <DetailItem
                label="Servizio assegnato"
                value={selectedStudent.assigned_service_name}
              />
              <DetailItem
                label="Presenze registrate"
                value={selectedStudent.attendance_count ?? 0}
              />
              <DetailItem
                label="Tipo certificato"
                value={selectedStudent.certificate_type === "pcto" ? "PCTO" : "Volontariato"}
              />
            </DetailSection>

            <DetailSection title="Contatti e scuola">
              <DetailItem label="Email studente" value={selectedStudent.student_email} />
              <DetailItem label="Telefono studente" value={selectedStudent.student_phone} />
              <DetailItem label="Indirizzo studente" value={selectedStudent.student_address} />
              <DetailItem label="Docente referente" value={selectedStudent.teacher_name} />
            </DetailSection>

            <DetailSection title="Iscrizione">
              <DetailItem
                label="Data iscrizione"
                value={formatDateTime(selectedStudent.registration_submitted_at)}
              />
              <DetailItem
                label="Posizione lista attesa"
                value={selectedStudent.waiting_list_position}
              />
              <DetailItem
                label="Conferma anagrafica"
                value={formatBoolean(selectedStudent.registry_confirmed)}
              />
              <DetailItem
                label="Invito inviato"
                value={formatBoolean(selectedStudent.invitation_sent)}
              />
              <DetailItem
                label="Preferenze amici"
                value={selectedStudent.friend_preferences}
              />
              <DetailItem
                label="Giorni non disponibili"
                value={selectedStudent.unavailable_days}
              />
              <DetailItem label="Note studente" value={selectedStudent.student_notes} />
              <DetailItem label="Note interne" value={selectedStudent.internal_notes} />
              <DetailItem label="Codice duplicato" value={selectedStudent.duplicate_code} />
              <DetailItem
                label="Marker duplicato"
                value={selectedStudent.duplicate_marker}
              />
            </DetailSection>

            <DetailSection title="Import">
              <DetailItem label="Codice sorgente" value={selectedStudent.source_code} />
              <DetailItem label="Foglio" value={selectedStudent.source_sheet_name} />
              <DetailItem
                label="Spreadsheet"
                value={selectedStudent.source_spreadsheet_id}
              />
              <DetailItem
                label="Importato il"
                value={formatDateTime(selectedStudent.imported_at)}
              />
              <DetailItem
                label="Creato il"
                value={formatDateTime(selectedStudent.created_at)}
              />
              <DetailItem
                label="Aggiornato il"
                value={formatDateTime(selectedStudent.updated_at)}
              />
            </DetailSection>

          </div>
        ) : null}

        {selectedStudent && editor?.mode === "edit" ? (
          <form
            key={selectedStudent.id}
            action={updatePctoStudentRegistrationAction}
            className="space-y-5"
          >
            <input type="hidden" name="redirect_to" value="/coordinatore/pcto" />
            <input type="hidden" name="id" value={selectedStudent.id} />

            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700">
              <p>
                {selectedStudent.student_first_name}{" "}
                {selectedStudent.student_last_name} -{" "}
                {selectedStudent.school_name ?? "scuola non indicata"}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Nome, cognome, scuola e presenze restano bloccati per preservare
                il dato importato e il collegamento con le presenze.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <TableField label="Nome visualizzato">
                <input
                  name="display_name"
                  defaultValue={selectedStudent.display_name ?? ""}
                  className={INPUT_CLASS_NAME}
                />
              </TableField>

              <TableField label="Stato">
                <input
                  name="registration_status"
                  defaultValue={selectedStudent.registration_status ?? ""}
                  className={INPUT_CLASS_NAME}
                />
              </TableField>

              <TableField label="Classe - anno">
                <input
                  name="class_year"
                  defaultValue={selectedStudent.class_year ?? ""}
                  className={INPUT_CLASS_NAME}
                />
              </TableField>

              <TableField label="Classe - sezione">
                <input
                  name="class_section"
                  defaultValue={selectedStudent.class_section ?? ""}
                  className={INPUT_CLASS_NAME}
                />
              </TableField>

              <TableField label="Servizio assegnato">
                <select
                  required
                  name="assigned_service_name"
                  defaultValue={selectedStudent.assigned_service_name ?? ""}
                  className={INPUT_CLASS_NAME}
                >
                  {assignedServiceNames.map((serviceName) => (
                    <option key={serviceName} value={serviceName}>
                      {serviceName}
                    </option>
                  ))}
                </select>
              </TableField>

              <TableField label="Tipo certificato">
                <select
                  required
                  name="certificate_type"
                  defaultValue={selectedStudent.certificate_type}
                  className={INPUT_CLASS_NAME}
                >
                  <option value="pcto">PCTO</option>
                  <option value="volontariato">Volontariato</option>
                </select>
              </TableField>

              <TableField label="Docente referente">
                <input
                  name="teacher_name"
                  defaultValue={selectedStudent.teacher_name ?? ""}
                  className={INPUT_CLASS_NAME}
                />
              </TableField>

              <TableField label="Email studente">
                <input
                  type="email"
                  name="student_email"
                  defaultValue={selectedStudent.student_email ?? ""}
                  className={INPUT_CLASS_NAME}
                />
              </TableField>

              <TableField label="Telefono studente">
                <input
                  name="student_phone"
                  defaultValue={selectedStudent.student_phone ?? ""}
                  className={INPUT_CLASS_NAME}
                />
              </TableField>

              <TableField label="Posizione lista attesa">
                <input
                  type="number"
                  name="waiting_list_position"
                  defaultValue={selectedStudent.waiting_list_position ?? ""}
                  className={INPUT_CLASS_NAME}
                />
              </TableField>

              <TableField label="Indirizzo studente" className="md:col-span-2">
                <input
                  name="student_address"
                  defaultValue={selectedStudent.student_address ?? ""}
                  className={INPUT_CLASS_NAME}
                />
              </TableField>

              <TableField label="Preferenze amici" className="md:col-span-2">
                <textarea
                  name="friend_preferences"
                  rows={3}
                  defaultValue={selectedStudent.friend_preferences ?? ""}
                  className={INPUT_CLASS_NAME}
                />
              </TableField>

              <TableField label="Giorni non disponibili" className="md:col-span-2">
                <textarea
                  name="unavailable_days"
                  rows={3}
                  defaultValue={selectedStudent.unavailable_days ?? ""}
                  className={INPUT_CLASS_NAME}
                />
              </TableField>

              <TableField label="Note studente" className="md:col-span-2">
                <textarea
                  name="student_notes"
                  rows={4}
                  defaultValue={selectedStudent.student_notes ?? ""}
                  className={INPUT_CLASS_NAME}
                />
              </TableField>

              <TableField label="Note interne" className="md:col-span-2">
                <textarea
                  name="internal_notes"
                  rows={4}
                  defaultValue={selectedStudent.internal_notes ?? ""}
                  className={INPUT_CLASS_NAME}
                />
              </TableField>

              <TableField label="Codice duplicato">
                <input
                  name="duplicate_code"
                  defaultValue={selectedStudent.duplicate_code ?? ""}
                  className={INPUT_CLASS_NAME}
                />
              </TableField>

              <TableField label="Marker duplicato">
                <input
                  name="duplicate_marker"
                  defaultValue={selectedStudent.duplicate_marker ?? ""}
                  className={INPUT_CLASS_NAME}
                />
              </TableField>

              <TableCheckboxField label="Anagrafica confermata">
                <input
                  type="checkbox"
                  name="registry_confirmed"
                  defaultChecked={selectedStudent.registry_confirmed ?? false}
                />
              </TableCheckboxField>

              <TableCheckboxField label="Invito inviato">
                <input
                  type="checkbox"
                  name="invitation_sent"
                  defaultChecked={selectedStudent.invitation_sent ?? false}
                />
              </TableCheckboxField>
            </div>

            <TableFormActions
              onCancel={() => setEditor({ id: selectedStudent.id, mode: "view" })}
              submitLabel="Aggiorna studente"
            />
          </form>
        ) : null}
      </TableDialog>
    </>
  );
}
