import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const csvPath = process.argv[2];

if (!csvPath) {
  console.error("Usage: node scripts/import-services-from-csv.mjs <csv-path>");
  process.exit(1);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing Supabase environment variables.");
  process.exit(1);
}

const DAY_MAP = new Map([
  ["lunedi", "Lunedi"],
  ["martedi", "Martedi"],
  ["mercoledi", "Mercoledi"],
  ["giovedi", "Giovedi"],
  ["venerdi", "Venerdi"],
  ["sabato", "Sabato"],
  ["domenica", "Domenica"],
  ["vari", "Vari"],
]);

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/[\u202A-\u202E\u2066-\u2069]/g, "")
    .replace(/\r/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function stripAccents(value) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function toTimeToken(value) {
  const normalized = normalizeText(value).replace(".", ":");
  if (!normalized) {
    return null;
  }

  if (/^\d{1,2}$/.test(normalized)) {
    return `${normalized.padStart(2, "0")}:00`;
  }

  if (/^\d{1,2}:\d{1,2}$/.test(normalized)) {
    const [hours, minutes] = normalized.split(":");
    return `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}`;
  }

  return null;
}

function parseSchedule(rawSchedule) {
  const scheduleLabel = normalizeText(rawSchedule);

  if (!scheduleLabel) {
    return {
      scheduleLabel: "",
      weekday: null,
      startTime: null,
      endTime: null,
    };
  }

  const simplified = stripAccents(scheduleLabel).toLowerCase();
  const dayKey =
    [...DAY_MAP.keys()].find((candidate) => simplified.startsWith(candidate)) ??
    null;

  const weekday = dayKey ? DAY_MAP.get(dayKey) : null;
  const matches = scheduleLabel.match(/(\d{1,2}(?::|\.)?\d{0,2})\s*-\s*(\d{1,2}(?::|\.)?\d{0,2})/);

  return {
    scheduleLabel,
    weekday,
    startTime: matches ? toTimeToken(matches[1]) : null,
    endTime: matches ? toTimeToken(matches[2]) : null,
  };
}

function parseSemicolonCsv(content) {
  const lines = content
    .split(/\n/)
    .map((line) => line.replace(/\r$/, ""))
    .filter((line) => line.trim() !== "");

  if (lines.length === 0) {
    return [];
  }

  const headers = lines[0].split(";").map((value) => normalizeText(value));

  return lines.slice(1).map((line) => {
    const values = line.split(";");
    const row = {};

    headers.forEach((header, index) => {
      row[header] = values[index] ?? "";
    });

    return row;
  });
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function main() {
  const resolvedPath = path.resolve(csvPath);
  const rawContent = fs.readFileSync(resolvedPath, "utf-8");
  const rows = parseSemicolonCsv(rawContent);
  let sourceActiveCount = 0;

  const { data: existingServices, error: fetchError } = await supabase
    .from("services")
    .select("id, name");

  if (fetchError) {
    throw fetchError;
  }

  const existingByName = new Map(
    (existingServices ?? []).map((service) => [service.name.toLowerCase(), service]),
  );

  const skipped = [];
  const inserts = [];
  const updates = [];

  for (const row of rows) {
    const name = normalizeText(row.Servizio);
    const address = normalizeText(row.Dove);
    const state = normalizeText(row.Stato);
    const type = normalizeText(row.tipo_servizio);
    const schedule = parseSchedule(row.Quando);
    const wasActiveInSource = state === "Attivo";

    if (!name) {
      skipped.push({ reason: "Nome servizio mancante", source: row.Servizio || "" });
      continue;
    }

    if (!address) {
      skipped.push({ reason: "Indirizzo mancante", source: name });
      continue;
    }

    if (!schedule.scheduleLabel || !schedule.weekday) {
      skipped.push({
        reason: "Campo 'Quando' assente o non interpretabile",
        source: name,
      });
      continue;
    }

    if (wasActiveInSource) {
      sourceActiveCount += 1;
    }

    const payload = {
      name,
      weekday: schedule.weekday,
      start_time: schedule.startTime,
      end_time: schedule.endTime,
      schedule_label: schedule.scheduleLabel,
      address,
      city: "Roma",
      certificate_label: type || null,
      // Services are imported inactive first because the database requires
      // at least one active coordinator before a service can be active.
      is_active: false,
    };

    const existing = existingByName.get(name.toLowerCase());

    if (existing) {
      updates.push({
        id: existing.id,
        ...payload,
      });
      continue;
    }

    inserts.push(payload);
  }

  if (inserts.length > 0) {
    const { error } = await supabase.from("services").insert(inserts);
    if (error) {
      throw error;
    }
  }

  for (const update of updates) {
    const { id, ...payload } = update;
    const { error } = await supabase.from("services").update(payload).eq("id", id);
    if (error) {
      throw error;
    }
  }

  console.log(`Imported services: ${inserts.length}`);
  console.log(`Updated services: ${updates.length}`);
  console.log(`Skipped services: ${skipped.length}`);
  console.log(`Active in source but imported inactive: ${sourceActiveCount}`);

  if (skipped.length > 0) {
    for (const entry of skipped) {
      console.log(`SKIPPED | ${entry.source} | ${entry.reason}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
