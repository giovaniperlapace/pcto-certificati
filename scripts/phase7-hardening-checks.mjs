#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";

function stripQuotes(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

async function loadDotEnvFile(filePath) {
  try {
    const content = await readFile(filePath, "utf8");

    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();

      if (!line || line.startsWith("#")) {
        continue;
      }

      const equalsIndex = line.indexOf("=");

      if (equalsIndex <= 0) {
        continue;
      }

      const key = line.slice(0, equalsIndex).trim();

      if (!key || process.env[key]) {
        continue;
      }

      const value = stripQuotes(line.slice(equalsIndex + 1).trim());
      process.env[key] = value;
    }
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return;
    }

    throw error;
  }
}

function requireEnv(name) {
  const value = process.env[name];

  if (!value || value.trim() === "") {
    throw new Error(`Variabile ambiente mancante: ${name}`);
  }

  return value.trim();
}

function dedupe(values) {
  return [...new Set(values)];
}

async function run() {
  const root = process.cwd();
  await loadDotEnvFile(path.join(root, ".env.local"));

  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const publishableKey = requireEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
    },
  });
  const anon = createClient(supabaseUrl, publishableKey, {
    auth: {
      persistSession: false,
    },
  });

  const issues = [];
  const notes = [];

  const { count: activeYearsCount, error: activeYearsError } = await admin
    .from("school_years")
    .select("id", { head: true, count: "exact" })
    .eq("is_active", true);

  if (activeYearsError) {
    throw activeYearsError;
  }

  if ((activeYearsCount ?? 0) !== 1) {
    issues.push(`Anni scolastici attivi attesi: 1, trovati: ${activeYearsCount ?? 0}.`);
  } else {
    notes.push("1 anno scolastico attivo: OK");
  }

  const { data: activeServices, error: activeServicesError } = await admin
    .from("services")
    .select("id, name")
    .eq("is_active", true);

  if (activeServicesError) {
    throw activeServicesError;
  }

  const activeServiceIds = (activeServices ?? []).map((service) => service.id);

  if (activeServiceIds.length === 0) {
    issues.push("Nessun servizio attivo disponibile.");
  } else {
    const { data: assignments, error: assignmentsError } = await admin
      .from("service_coordinators")
      .select("service_id, coordinator_id")
      .in("service_id", activeServiceIds);

    if (assignmentsError) {
      throw assignmentsError;
    }

    const coordinatorIds = dedupe((assignments ?? []).map((item) => item.coordinator_id));
    const { data: activeCoordinators, error: coordinatorsError } = coordinatorIds.length
      ? await admin
          .from("coordinators")
          .select("id")
          .in("id", coordinatorIds)
          .eq("is_active", true)
      : { data: [], error: null };

    if (coordinatorsError) {
      throw coordinatorsError;
    }

    const activeCoordinatorIds = new Set((activeCoordinators ?? []).map((item) => item.id));
    const activeServicesWithoutCoordinator = (activeServices ?? []).filter((service) => {
      const serviceAssignments = (assignments ?? []).filter(
        (assignment) => assignment.service_id === service.id,
      );

      return !serviceAssignments.some((assignment) =>
        activeCoordinatorIds.has(assignment.coordinator_id),
      );
    });

    if (activeServicesWithoutCoordinator.length > 0) {
      issues.push(
        `Servizi attivi senza coordinatore attivo: ${activeServicesWithoutCoordinator
          .map((service) => service.name)
          .join(", ")}.`,
      );
    } else {
      notes.push("Tutti i servizi attivi hanno almeno un coordinatore attivo: OK");
    }
  }

  const { data: completedRequests, error: completedError } = await admin
    .from("certificate_requests")
    .select(
      "id, send_to_school, send_to_teacher, pdf_storage_path, pdf_generated_at, student_emailed_at, school_emailed_at, teacher_emailed_at",
    )
    .eq("status", "completed");

  if (completedError) {
    throw completedError;
  }

  for (const request of completedRequests ?? []) {
    if (!request.pdf_storage_path || !request.pdf_generated_at) {
      issues.push(`Richiesta completed ${request.id} senza PDF valido.`);
    }

    if (!request.student_emailed_at) {
      issues.push(`Richiesta completed ${request.id} senza invio allo studente.`);
    }

    if (request.send_to_school && !request.school_emailed_at) {
      issues.push(`Richiesta completed ${request.id} senza invio alla scuola.`);
    }

    if (request.send_to_teacher && !request.teacher_emailed_at) {
      issues.push(`Richiesta completed ${request.id} senza invio al docente.`);
    }
  }

  notes.push(`Richieste completed controllate: ${(completedRequests ?? []).length}`);

  const { data: approvedRequests, error: approvedError } = await admin
    .from("certificate_requests")
    .select("id, reviewed_at, reviewed_by_coordinator_id, approved_at")
    .eq("status", "approved");

  if (approvedError) {
    throw approvedError;
  }

  for (const request of approvedRequests ?? []) {
    if (!request.reviewed_at || !request.reviewed_by_coordinator_id || !request.approved_at) {
      issues.push(`Richiesta approved ${request.id} con metadata revisione incompleti.`);
    }
  }

  notes.push(`Richieste approved controllate: ${(approvedRequests ?? []).length}`);

  const { data: deliveryFailedRequests, error: deliveryFailedError } = await admin
    .from("certificate_requests")
    .select("id, pdf_storage_path, pdf_generated_at")
    .eq("status", "delivery_failed");

  if (deliveryFailedError) {
    throw deliveryFailedError;
  }

  const deliveryFailedIds = (deliveryFailedRequests ?? []).map((request) => request.id);
  const { data: failedDeliveries, error: failedDeliveriesError } = deliveryFailedIds.length
    ? await admin
        .from("email_deliveries")
        .select("request_id")
        .eq("status", "failed")
        .in("request_id", deliveryFailedIds)
    : { data: [], error: null };

  if (failedDeliveriesError) {
    throw failedDeliveriesError;
  }

  const failedDeliveryRequestIds = new Set(
    (failedDeliveries ?? []).map((delivery) => delivery.request_id),
  );

  for (const request of deliveryFailedRequests ?? []) {
    const hasDeliveryFailure = failedDeliveryRequestIds.has(request.id);
    const hasPdfGenerationFailure = !request.pdf_storage_path || !request.pdf_generated_at;

    if (!hasDeliveryFailure && !hasPdfGenerationFailure) {
      issues.push(
        `Richiesta delivery_failed ${request.id} senza evidenza di errore su PDF o invio email.`,
      );
    }
  }

  notes.push(`Richieste delivery_failed controllate: ${(deliveryFailedRequests ?? []).length}`);

  const { data: buckets, error: bucketsError } = await admin.storage.listBuckets();

  if (bucketsError) {
    throw bucketsError;
  }

  const certificateBucket = (buckets ?? []).find(
    (bucket) => bucket.id === "certificate-pdfs" || bucket.name === "certificate-pdfs",
  );

  if (!certificateBucket) {
    issues.push("Bucket storage 'certificate-pdfs' non trovato.");
  } else if (certificateBucket.public) {
    issues.push("Bucket storage 'certificate-pdfs' deve essere privato (public=false).");
  } else {
    notes.push("Bucket 'certificate-pdfs' privato: OK");
  }

  const restrictedTables = [
    "certificate_requests",
    "request_events",
    "email_deliveries",
  ];

  for (const tableName of restrictedTables) {
    const { count, error } = await anon
      .from(tableName)
      .select("id", { head: true, count: "exact" });

    if (error) {
      notes.push(`Accesso anon a ${tableName}: bloccato con errore (${error.message}).`);
      continue;
    }

    if ((count ?? 0) > 0) {
      issues.push(`Accesso anon non previsto su ${tableName}: ${count} righe visibili.`);
    } else {
      notes.push(`Accesso anon su ${tableName}: nessuna riga visibile (OK).`);
    }
  }

  console.log("\nFase 7 hardening checks\n");

  for (const note of notes) {
    console.log(`- ${note}`);
  }

  if (issues.length === 0) {
    console.log("\nEsito: OK (nessuna anomalia bloccante).\n");
    return;
  }

  console.log("\nEsito: KO\n");

  for (const issue of issues) {
    console.log(`- ${issue}`);
  }

  process.exitCode = 1;
}

run().catch((error) => {
  console.error("\nErrore durante i controlli di hardening:");
  console.error(error);
  process.exitCode = 1;
});
