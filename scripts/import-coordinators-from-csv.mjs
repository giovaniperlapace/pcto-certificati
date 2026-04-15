import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const csvPath = process.argv[2];

if (!csvPath) {
  console.error("Usage: node scripts/import-coordinators-from-csv.mjs <csv-path>");
  process.exit(1);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing Supabase environment variables.");
  process.exit(1);
}

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/^[\uFEFF]/, "")
    .replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069\u200B\u200C\u200D]/g, "")
    .replace(/\r/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeEmail(value) {
  return normalizeText(value).toLowerCase();
}

function normalizePhone(value) {
  const normalized = normalizeText(value);
  if (!normalized) {
    return null;
  }

  const digitsOnly = normalized.replace(/[^\d+]/g, "");
  return digitsOnly || null;
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

function splitFullName(rawName) {
  const fullName = normalizeText(rawName);

  if (!fullName) {
    return { firstName: "", lastName: "" };
  }

  const parts = fullName.split(" ").filter(Boolean);

  if (parts.length === 1) {
    return {
      firstName: parts[0],
      lastName: "(cognome mancante)",
    };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
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

  const { data: existingCoordinators, error: fetchError } = await supabase
    .from("coordinators")
    .select("id, email");

  if (fetchError) {
    throw fetchError;
  }

  const existingByEmail = new Map(
    (existingCoordinators ?? []).map((coordinator) => [
      normalizeEmail(coordinator.email),
      coordinator,
    ]),
  );

  const skipped = [];
  const inserts = [];
  const updates = [];

  for (const row of rows) {
    const fullName = normalizeText(row.Referente);
    const email = normalizeEmail(row.email);
    const phone = normalizePhone(row.Telefono);

    if (!fullName) {
      skipped.push({ reason: "Nome referente mancante", source: JSON.stringify(row) });
      continue;
    }

    if (!email) {
      skipped.push({ reason: "Email mancante", source: fullName });
      continue;
    }

    const { firstName, lastName } = splitFullName(fullName);

    if (!firstName || !lastName) {
      skipped.push({ reason: "Nome/cognome non valido", source: fullName });
      continue;
    }

    const payload = {
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
      is_active: true,
    };

    const existing = existingByEmail.get(email);

    if (existing) {
      updates.push({ id: existing.id, ...payload });
    } else {
      inserts.push(payload);
    }
  }

  if (inserts.length > 0) {
    const { error } = await supabase.from("coordinators").insert(inserts);
    if (error) {
      throw error;
    }
  }

  for (const update of updates) {
    const { id, ...payload } = update;
    const { error } = await supabase.from("coordinators").update(payload).eq("id", id);
    if (error) {
      throw error;
    }
  }

  console.log(`Imported coordinators: ${inserts.length}`);
  console.log(`Updated coordinators: ${updates.length}`);
  console.log(`Skipped coordinators: ${skipped.length}`);

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
