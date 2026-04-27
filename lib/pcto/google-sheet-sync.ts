import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

const PCTO_GOOGLE_SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1Wa9EOEsUzt_ii7cqOXLoaZ8dRlC19VMl3hHJfliGMfw/edit?usp=sharing";
const PCTO_GOOGLE_SHEET_ID = "1Wa9EOEsUzt_ii7cqOXLoaZ8dRlC19VMl3hHJfliGMfw";
const SCHOOL_YEAR_LABEL = "2025/2026";
const REGISTRATIONS_SHEET = {
  gid: "160656318",
  name: "Iscritti",
};
const ATTENDANCE_SHEET = {
  gid: "2136826759",
  name: "Presenze",
};

type AdminClient = SupabaseClient<Database>;
type RegistrationInsert =
  Database["public"]["Tables"]["pcto_student_registrations"]["Insert"];
type RegistrationRow =
  Database["public"]["Tables"]["pcto_student_registrations"]["Row"];
type AttendanceInsert =
  Database["public"]["Tables"]["pcto_attendance_records"]["Insert"];
type CertificateType = Database["public"]["Enums"]["certificate_type"];

type SheetDefinition = {
  gid: string;
  name: string;
};

type ParsedSheetRow = {
  rowNumber: number;
  valuesByHeader: Record<string, string>;
  rawData: Record<string, string>;
};

type SyncResult = {
  attendanceRowsProcessed: number;
  attendanceRowsSkipped: number;
  attendanceRowsLinked: number;
  registrationRowsProcessed: number;
  registrationRowsSkipped: number;
};

const REGISTRATION_HEADERS = {
  assignedServiceName: "Luogo",
  attendanceCount: "Presenze",
  certificateType: "Tipo",
  classSection: "Sezione",
  classYear: "Classe",
  displayName: "Name_Surname",
  duplicateCode: "Dup",
  duplicateMarker: "Doppione",
  friendPreferences: "Amici",
  internalNotes: "Note_nostre",
  invitationSent: "Invito",
  registrationStatus: "Stato",
  registrationSubmittedAt: "Inserimento",
  registryConfirmed: "Registro",
  schoolName: "Scuola",
  sourceCode: "Code",
  studentAddress: "Indirizzo",
  studentEmail: "Email",
  studentFirstName: "Nome",
  studentLastName: "Cognome",
  studentNotes: "Note",
  studentPhone: "Telefono",
  teacherName: "Professore di riferimento per la PCTO nella tua scuola",
  unavailableDays: "Non_disponibile",
  waitingListPosition: "Attesa",
} as const;

const ATTENDANCE_HEADERS = {
  checkInTime: "Ora di entrata",
  checkOutTime: "Ora di uscita",
  notes: "Se hai bisogno di comunicarci qualcosa scrivila pure qui",
  serviceDate: "Data del servizio",
  serviceName: "Dove stai facendo servizio",
  sourceCode: "Il tuo codice ID",
  studentFirstName: "Nome",
  studentLastName: "Cognome",
  submittedAt: "Informazioni cronologiche",
} as const;

const TEMP_SOURCE_ROW_OFFSET = 1_000_000;

function normalizeText(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  return value.replace(/\r/g, " ").trim().replace(/\s+/g, " ");
}

function isConcludedRegistrationStatus(value: string | null | undefined) {
  return normalizeText(value).toLowerCase() === "concluso";
}

function blankToNull(value: string | null | undefined) {
  const normalized = normalizeText(value);
  return normalized === "" ? null : normalized;
}

function parseBoolean(value: string | null | undefined) {
  const normalized = normalizeText(value).toLowerCase();

  if (normalized === "") {
    return null;
  }

  if (["1", "si", "sì", "true", "vero", "yes"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "falso", "no"].includes(normalized)) {
    return false;
  }

  return null;
}

function parseInteger(value: string | null | undefined) {
  const normalized = normalizeText(value);

  if (normalized === "") {
    return null;
  }

  const numericValue = Number(normalized.replace(",", "."));

  if (!Number.isFinite(numericValue)) {
    return null;
  }

  return Math.trunc(numericValue);
}

function parseCertificateType(value: string | null | undefined): CertificateType {
  return normalizeText(value).toLowerCase() === "volontariato"
    ? "volontariato"
    : "pcto";
}

function parseDate(value: string | null | undefined) {
  const normalized = normalizeText(value);

  if (normalized === "") {
    return null;
  }

  const match = normalized.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

  if (!match) {
    return null;
  }

  const [, day, month, year] = match;
  return `${year}-${month}-${day}`;
}

function parseTime(value: string | null | undefined) {
  const normalized = normalizeText(value);

  if (normalized === "") {
    return null;
  }

  const match = normalized.match(/^(\d{2})[:.](\d{2})(?:[:.](\d{2}))?$/);

  if (!match) {
    return null;
  }

  const [, hours, minutes, seconds = "00"] = match;
  return `${hours}:${minutes}:${seconds}`;
}

function parseDateTime(value: string | null | undefined) {
  const normalized = normalizeText(value);

  if (normalized === "") {
    return null;
  }

  const match = normalized.match(
    /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2})[:.](\d{2})(?:[:.](\d{2}))?$/,
  );

  if (!match) {
    return null;
  }

  const [, day, month, year, hours, minutes, seconds = "00"] = match;
  const offsetHours = getEuropeRomeOffsetHours(
    Number.parseInt(year, 10),
    Number.parseInt(month, 10),
    Number.parseInt(day, 10),
    Number.parseInt(hours, 10),
  );

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}+0${offsetHours}:00`;
}

function getEuropeRomeOffsetHours(
  year: number,
  month: number,
  day: number,
  hours: number,
) {
  const daylightSavingStartDay = getLastSundayOfMonth(year, 3);
  const daylightSavingEndDay = getLastSundayOfMonth(year, 10);
  const isAfterDaylightSavingStart =
    month > 3 ||
    (month === 3 &&
      (day > daylightSavingStartDay ||
        (day === daylightSavingStartDay && hours >= 2)));
  const isBeforeDaylightSavingEnd =
    month < 10 ||
    (month === 10 &&
      (day < daylightSavingEndDay || (day === daylightSavingEndDay && hours < 3)));

  return isAfterDaylightSavingStart && isBeforeDaylightSavingEnd ? 2 : 1;
}

function getLastSundayOfMonth(year: number, month: number) {
  const lastDay = new Date(Date.UTC(year, month, 0));

  while (lastDay.getUTCDay() !== 0) {
    lastDay.setUTCDate(lastDay.getUTCDate() - 1);
  }

  return lastDay.getUTCDate();
}

function computeDurationMinutes(
  checkInTime: string | null,
  checkOutTime: string | null,
) {
  if (!checkInTime || !checkOutTime) {
    return null;
  }

  const startMinutes =
    Number.parseInt(checkInTime.slice(0, 2), 10) * 60 +
    Number.parseInt(checkInTime.slice(3, 5), 10);
  const endMinutes =
    Number.parseInt(checkOutTime.slice(0, 2), 10) * 60 +
    Number.parseInt(checkOutTime.slice(3, 5), 10);
  const duration = endMinutes - startMinutes;

  return duration >= 0 ? duration : null;
}

function chunkArray<T>(items: T[], chunkSize = 100) {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }

  return chunks;
}

function parseCsv(csvText: string) {
  const rows: string[][] = [];
  const source = csvText.charCodeAt(0) === 0xfeff ? csvText.slice(1) : csvText;
  let currentRow: string[] = [];
  let currentCell = "";
  let insideQuotes = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];

    if (insideQuotes) {
      if (character === "\"") {
        if (source[index + 1] === "\"") {
          currentCell += "\"";
          index += 1;
        } else {
          insideQuotes = false;
        }
      } else {
        currentCell += character;
      }

      continue;
    }

    if (character === "\"") {
      insideQuotes = true;
      continue;
    }

    if (character === ",") {
      currentRow.push(currentCell);
      currentCell = "";
      continue;
    }

    if (character === "\n") {
      if (currentCell.endsWith("\r")) {
        currentCell = currentCell.slice(0, -1);
      }

      currentRow.push(currentCell);
      rows.push(currentRow);
      currentRow = [];
      currentCell = "";
      continue;
    }

    currentCell += character;
  }

  if (currentCell.endsWith("\r")) {
    currentCell = currentCell.slice(0, -1);
  }

  currentRow.push(currentCell);
  rows.push(currentRow);

  return rows;
}

function parseSheetRows(csvText: string) {
  const rows = parseCsv(csvText);
  const headers = rows[0]?.map((header) => normalizeText(header)) ?? [];

  return rows.slice(1).map((row, index) => {
    const valuesByHeader: Record<string, string> = {};
    const rawData: Record<string, string> = {};

    headers.forEach((header, headerIndex) => {
      if (header === "") {
        return;
      }

      const value = row[headerIndex] ?? "";
      valuesByHeader[header] = value;
      rawData[header] = value;
    });

    return {
      rowNumber: index + 2,
      valuesByHeader,
      rawData,
    } satisfies ParsedSheetRow;
  });
}

async function fetchGoogleSheetCsv(sheet: SheetDefinition) {
  const response = await fetch(
    `https://docs.google.com/spreadsheets/d/${PCTO_GOOGLE_SHEET_ID}/export?format=csv&gid=${sheet.gid}`,
    {
      cache: "no-store",
      headers: {
        Accept: "text/csv",
      },
    },
  );

  if (!response.ok) {
    throw new Error(
      `Google Fogli ha risposto con errore ${response.status} durante la lettura di ${sheet.name}.`,
    );
  }

  return response.text();
}

async function loadSchoolYearId(supabase: AdminClient) {
  const { data, error } = await supabase
    .from("school_years")
    .select("id")
    .eq("label", SCHOOL_YEAR_LABEL)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error(
      `Anno scolastico ${SCHOOL_YEAR_LABEL} non trovato in Supabase.`,
    );
  }

  return data.id;
}

function buildRegistrationInsert(
  row: ParsedSheetRow,
  schoolYearId: string,
): RegistrationInsert | null {
  const sourceCode = normalizeText(row.valuesByHeader[REGISTRATION_HEADERS.sourceCode]);
  const studentFirstName = normalizeText(
    row.valuesByHeader[REGISTRATION_HEADERS.studentFirstName],
  );
  const studentLastName = normalizeText(
    row.valuesByHeader[REGISTRATION_HEADERS.studentLastName],
  );

  if (!sourceCode || !studentFirstName || !studentLastName) {
    return null;
  }

  return {
    assigned_service_name: blankToNull(
      row.valuesByHeader[REGISTRATION_HEADERS.assignedServiceName],
    ),
    attendance_count: parseInteger(
      row.valuesByHeader[REGISTRATION_HEADERS.attendanceCount],
    ),
    certificate_type: parseCertificateType(
      row.valuesByHeader[REGISTRATION_HEADERS.certificateType],
    ),
    class_section: blankToNull(
      row.valuesByHeader[REGISTRATION_HEADERS.classSection],
    ),
    class_year: blankToNull(row.valuesByHeader[REGISTRATION_HEADERS.classYear]),
    display_name: blankToNull(row.valuesByHeader[REGISTRATION_HEADERS.displayName]),
    duplicate_code: blankToNull(
      row.valuesByHeader[REGISTRATION_HEADERS.duplicateCode],
    ),
    duplicate_marker: blankToNull(
      row.valuesByHeader[REGISTRATION_HEADERS.duplicateMarker],
    ),
    friend_preferences: blankToNull(
      row.valuesByHeader[REGISTRATION_HEADERS.friendPreferences],
    ),
    imported_at: new Date().toISOString(),
    internal_notes: blankToNull(
      row.valuesByHeader[REGISTRATION_HEADERS.internalNotes],
    ),
    invitation_sent: parseBoolean(
      row.valuesByHeader[REGISTRATION_HEADERS.invitationSent],
    ),
    raw_data: row.rawData,
    registration_status: blankToNull(
      row.valuesByHeader[REGISTRATION_HEADERS.registrationStatus],
    ),
    registration_submitted_at: parseDateTime(
      row.valuesByHeader[REGISTRATION_HEADERS.registrationSubmittedAt],
    ),
    registry_confirmed: parseBoolean(
      row.valuesByHeader[REGISTRATION_HEADERS.registryConfirmed],
    ),
    school_name: blankToNull(row.valuesByHeader[REGISTRATION_HEADERS.schoolName]),
    school_year_id: schoolYearId,
    source_code: sourceCode,
    source_row_number: row.rowNumber,
    source_sheet_name: REGISTRATIONS_SHEET.name,
    source_spreadsheet_id: PCTO_GOOGLE_SHEET_ID,
    student_address: blankToNull(
      row.valuesByHeader[REGISTRATION_HEADERS.studentAddress],
    ),
    student_email: blankToNull(
      row.valuesByHeader[REGISTRATION_HEADERS.studentEmail],
    ),
    student_first_name: studentFirstName,
    student_last_name: studentLastName,
    student_notes: blankToNull(row.valuesByHeader[REGISTRATION_HEADERS.studentNotes]),
    student_phone: blankToNull(row.valuesByHeader[REGISTRATION_HEADERS.studentPhone]),
    teacher_name: blankToNull(row.valuesByHeader[REGISTRATION_HEADERS.teacherName]),
    unavailable_days: blankToNull(
      row.valuesByHeader[REGISTRATION_HEADERS.unavailableDays],
    ),
    waiting_list_position: parseInteger(
      row.valuesByHeader[REGISTRATION_HEADERS.waitingListPosition],
    ),
  };
}

function buildAttendanceInsert(
  row: ParsedSheetRow,
  schoolYearId: string,
  registrationIdsByCode: Map<string, string>,
): AttendanceInsert | null {
  const sourceCode = normalizeText(row.valuesByHeader[ATTENDANCE_HEADERS.sourceCode]);

  if (!sourceCode) {
    return null;
  }

  const checkInTime = parseTime(row.valuesByHeader[ATTENDANCE_HEADERS.checkInTime]);
  const checkOutTime = parseTime(
    row.valuesByHeader[ATTENDANCE_HEADERS.checkOutTime],
  );

  return {
    check_in_time: checkInTime,
    check_out_time: checkOutTime,
    duration_minutes: computeDurationMinutes(checkInTime, checkOutTime),
    imported_at: new Date().toISOString(),
    notes: blankToNull(row.valuesByHeader[ATTENDANCE_HEADERS.notes]),
    raw_data: row.rawData,
    school_year_id: schoolYearId,
    service_date: parseDate(row.valuesByHeader[ATTENDANCE_HEADERS.serviceDate]),
    service_name: blankToNull(row.valuesByHeader[ATTENDANCE_HEADERS.serviceName]),
    source_code: sourceCode,
    source_row_number: row.rowNumber,
    source_sheet_name: ATTENDANCE_SHEET.name,
    source_spreadsheet_id: PCTO_GOOGLE_SHEET_ID,
    student_first_name: blankToNull(
      row.valuesByHeader[ATTENDANCE_HEADERS.studentFirstName],
    ),
    student_last_name: blankToNull(
      row.valuesByHeader[ATTENDANCE_HEADERS.studentLastName],
    ),
    student_registration_id: registrationIdsByCode.get(sourceCode) ?? null,
    submitted_at: parseDateTime(row.valuesByHeader[ATTENDANCE_HEADERS.submittedAt]),
  };
}

async function upsertRegistrationRows(
  supabase: AdminClient,
  rows: RegistrationInsert[],
) {
  for (const chunk of chunkArray(rows)) {
    const { error } = await supabase.from("pcto_student_registrations").upsert(
      chunk,
      {
        onConflict: "school_year_id,source_code",
      },
    );

    if (error) {
      throw error;
    }
  }
}

async function loadRegistrationSourceRows(
  supabase: AdminClient,
  schoolYearId: string,
) {
  const { data, error } = await supabase
    .from("pcto_student_registrations")
    .select("id, source_code, source_row_number")
    .eq("school_year_id", schoolYearId)
    .eq("source_spreadsheet_id", PCTO_GOOGLE_SHEET_ID)
    .eq("source_sheet_name", REGISTRATIONS_SHEET.name);

  if (error) {
    throw error;
  }

  return data satisfies Pick<
    RegistrationRow,
    "id" | "source_code" | "source_row_number"
  >[];
}

async function releaseConflictingRegistrationSourceRows(
  supabase: AdminClient,
  schoolYearId: string,
  rows: RegistrationInsert[],
) {
  const incomingCodeByRowNumber = new Map(
    rows.map((row) => [row.source_row_number, row.source_code]),
  );
  const incomingRowNumberByCode = new Map(
    rows.map((row) => [row.source_code, row.source_row_number]),
  );
  const existingRows = await loadRegistrationSourceRows(supabase, schoolYearId);
  const conflictingRows = existingRows.filter((row) => {
    const incomingCodeForCurrentRow = incomingCodeByRowNumber.get(
      row.source_row_number,
    );
    const incomingRowForCurrentCode = incomingRowNumberByCode.get(row.source_code);

    return (
      (incomingCodeForCurrentRow !== undefined &&
        incomingCodeForCurrentRow !== row.source_code) ||
      (incomingRowForCurrentCode !== undefined &&
        incomingRowForCurrentCode !== row.source_row_number)
    );
  });
  const reservedRowNumbers = new Set(
    existingRows.map((row) => row.source_row_number),
  );
  let nextTemporaryRowNumber = TEMP_SOURCE_ROW_OFFSET;

  for (const row of conflictingRows) {
    while (reservedRowNumbers.has(nextTemporaryRowNumber)) {
      nextTemporaryRowNumber += 1;
    }

    const temporaryRowNumber = nextTemporaryRowNumber;
    reservedRowNumbers.delete(row.source_row_number);
    reservedRowNumbers.add(temporaryRowNumber);
    nextTemporaryRowNumber += 1;

    const { error } = await supabase
      .from("pcto_student_registrations")
      .update({
        source_row_number: temporaryRowNumber,
      })
      .eq("id", row.id);

    if (error) {
      throw error;
    }
  }
}

async function loadConcludedRegistrationCodes(
  supabase: AdminClient,
  schoolYearId: string,
) {
  const { data, error } = await supabase
    .from("pcto_student_registrations")
    .select("source_code, registration_status")
    .eq("school_year_id", schoolYearId)
    .eq("source_spreadsheet_id", PCTO_GOOGLE_SHEET_ID);

  if (error) {
    throw error;
  }

  return new Set(
    (data ?? [])
      .filter((row) => isConcludedRegistrationStatus(row.registration_status))
      .map((row) => row.source_code),
  );
}

async function loadRegistrationIdsByCode(
  supabase: AdminClient,
  schoolYearId: string,
) {
  const { data, error } = await supabase
    .from("pcto_student_registrations")
    .select("id, source_code")
    .eq("school_year_id", schoolYearId)
    .eq("source_spreadsheet_id", PCTO_GOOGLE_SHEET_ID);

  if (error) {
    throw error;
  }

  return new Map(data.map((row) => [row.source_code, row.id]));
}

async function upsertAttendanceRows(supabase: AdminClient, rows: AttendanceInsert[]) {
  for (const chunk of chunkArray(rows)) {
    const { error } = await supabase.from("pcto_attendance_records").upsert(chunk, {
      onConflict: "source_spreadsheet_id,source_sheet_name,source_row_number",
    });

    if (error) {
      throw error;
    }
  }
}

export async function syncPctoGoogleSheetImport(supabase: AdminClient) {
  const schoolYearId = await loadSchoolYearId(supabase);
  const [registrationsCsv, attendanceCsv] = await Promise.all([
    fetchGoogleSheetCsv(REGISTRATIONS_SHEET),
    fetchGoogleSheetCsv(ATTENDANCE_SHEET),
  ]);

  const registrationRows = parseSheetRows(registrationsCsv);
  const attendanceRows = parseSheetRows(attendanceCsv);

  const concludedRegistrationCodes = await loadConcludedRegistrationCodes(
    supabase,
    schoolYearId,
  );
  const registrationInserts = registrationRows
    .map((row) => buildRegistrationInsert(row, schoolYearId))
    .map((row) =>
      row && concludedRegistrationCodes.has(row.source_code)
        ? {
            ...row,
            registration_status: "Concluso",
          }
        : row,
    )
    .filter((row): row is RegistrationInsert => row !== null);
  const registrationRowsSkipped = registrationRows.length - registrationInserts.length;

  await releaseConflictingRegistrationSourceRows(
    supabase,
    schoolYearId,
    registrationInserts,
  );
  await upsertRegistrationRows(supabase, registrationInserts);

  const registrationIdsByCode = await loadRegistrationIdsByCode(supabase, schoolYearId);
  const attendanceInserts = attendanceRows
    .map((row) =>
      buildAttendanceInsert(row, schoolYearId, registrationIdsByCode),
    )
    .filter((row): row is AttendanceInsert => row !== null);
  const attendanceRowsSkipped = attendanceRows.length - attendanceInserts.length;

  await upsertAttendanceRows(supabase, attendanceInserts);

  const attendanceRowsLinked = attendanceInserts.filter(
    (row) => row.student_registration_id !== null,
  ).length;

  return {
    attendanceRowsLinked,
    attendanceRowsProcessed: attendanceInserts.length,
    attendanceRowsSkipped,
    registrationRowsProcessed: registrationInserts.length,
    registrationRowsSkipped,
  } satisfies SyncResult;
}

export function getPctoGoogleSheetUrl() {
  return PCTO_GOOGLE_SHEET_URL;
}
