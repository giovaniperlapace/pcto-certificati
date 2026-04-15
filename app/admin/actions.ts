"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertAdmin } from "@/lib/auth/admin";
import {
  readBoolean,
  readOptionalId,
  readOptionalString,
  readRedirectPath,
  readRequiredString,
} from "@/lib/utils/form-data";

function redirectWithMessage(
  path: string,
  type: "error" | "success",
  message: string,
) {
  redirect(`${path}?${type}=${encodeURIComponent(message)}`);
}

function handleActionError(error: unknown, fallbackMessage: string) {
  if (error instanceof Error && error.message.trim() !== "") {
    return error.message;
  }

  return fallbackMessage;
}

export async function signOutAction() {
  const { supabase } = await assertAdmin();
  await supabase.auth.signOut();
  redirect("/");
}

export async function upsertSchoolAction(formData: FormData) {
  const redirectTo = readRedirectPath(formData, "/admin/scuole");

  try {
    const { supabase } = await assertAdmin();
    const id = readOptionalId(formData, "id");

    const payload = {
      short_name: readRequiredString(formData, "short_name"),
      full_name: readRequiredString(formData, "full_name"),
      school_email: readOptionalString(formData, "school_email"),
      teacher_name: readOptionalString(formData, "teacher_name"),
      teacher_email: readOptionalString(formData, "teacher_email"),
      send_certificate_to_school_by_default: readBoolean(
        formData,
        "send_certificate_to_school_by_default",
      ),
      send_certificate_to_teacher_by_default: readBoolean(
        formData,
        "send_certificate_to_teacher_by_default",
      ),
      is_active: readBoolean(formData, "is_active"),
      notes: readOptionalString(formData, "notes"),
    };

    const query = id
      ? supabase.from("schools").update(payload).eq("id", id)
      : supabase.from("schools").insert(payload);

    const { error } = await query;

    if (error) {
      throw error;
    }

    revalidatePath("/admin");
    revalidatePath("/admin/scuole");
    redirectWithMessage(
      redirectTo,
      "success",
      id ? "Scuola aggiornata." : "Scuola creata.",
    );
  } catch (error) {
    redirectWithMessage(
      redirectTo,
      "error",
      handleActionError(error, "Impossibile salvare la scuola."),
    );
  }
}

export async function upsertCoordinatorAction(formData: FormData) {
  const redirectTo = readRedirectPath(formData, "/admin/coordinatori");

  try {
    const { supabase } = await assertAdmin();
    const id = readOptionalId(formData, "id");

    const payload = {
      first_name: readRequiredString(formData, "first_name"),
      last_name: readRequiredString(formData, "last_name"),
      email: readRequiredString(formData, "email"),
      phone: readOptionalString(formData, "phone"),
      is_active: readBoolean(formData, "is_active"),
    };

    const query = id
      ? supabase.from("coordinators").update(payload).eq("id", id)
      : supabase.from("coordinators").insert(payload);

    const { error } = await query;

    if (error) {
      throw error;
    }

    revalidatePath("/admin");
    revalidatePath("/admin/coordinatori");
    revalidatePath("/admin/servizi");
    redirectWithMessage(
      redirectTo,
      "success",
      id ? "Coordinatore aggiornato." : "Coordinatore creato.",
    );
  } catch (error) {
    redirectWithMessage(
      redirectTo,
      "error",
      handleActionError(error, "Impossibile salvare il coordinatore."),
    );
  }
}

export async function upsertServiceAction(formData: FormData) {
  const redirectTo = readRedirectPath(formData, "/admin/servizi");

  try {
    const { supabase } = await assertAdmin();
    const id = readOptionalId(formData, "id");

    const payload = {
      name: readRequiredString(formData, "name"),
      weekday: readRequiredString(formData, "weekday"),
      start_time: readOptionalString(formData, "start_time"),
      end_time: readOptionalString(formData, "end_time"),
      schedule_label: readRequiredString(formData, "schedule_label"),
      address: readRequiredString(formData, "address"),
      city: readRequiredString(formData, "city"),
      certificate_label: readOptionalString(formData, "certificate_label"),
      is_active: readBoolean(formData, "is_active"),
    };

    const query = id
      ? supabase.from("services").update(payload).eq("id", id)
      : supabase.from("services").insert(payload);

    const { error } = await query;

    if (error) {
      throw error;
    }

    revalidatePath("/admin");
    revalidatePath("/admin/servizi");
    redirectWithMessage(
      redirectTo,
      "success",
      id ? "Servizio aggiornato." : "Servizio creato.",
    );
  } catch (error) {
    redirectWithMessage(
      redirectTo,
      "error",
      handleActionError(error, "Impossibile salvare il servizio."),
    );
  }
}

export async function addServiceCoordinatorAction(formData: FormData) {
  const serviceId = readRequiredString(formData, "service_id");
  const redirectTo = readRedirectPath(
    formData,
    `/admin/servizi/${serviceId}`,
  );

  try {
    const { supabase } = await assertAdmin();

    const { error } = await supabase.from("service_coordinators").insert({
      service_id: serviceId,
      coordinator_id: readRequiredString(formData, "coordinator_id"),
      is_primary: readBoolean(formData, "is_primary"),
      receives_new_request_notifications: readBoolean(
        formData,
        "receives_new_request_notifications",
      ),
    });

    if (error) {
      throw error;
    }

    revalidatePath("/admin/servizi");
    revalidatePath(redirectTo);
    redirectWithMessage(redirectTo, "success", "Coordinatore collegato.");
  } catch (error) {
    redirectWithMessage(
      redirectTo,
      "error",
      handleActionError(error, "Impossibile collegare il coordinatore."),
    );
  }
}

export async function updateServiceCoordinatorAction(formData: FormData) {
  const serviceId = readRequiredString(formData, "service_id");
  const coordinatorId = readRequiredString(formData, "coordinator_id");
  const redirectTo = readRedirectPath(
    formData,
    `/admin/servizi/${serviceId}`,
  );

  try {
    const { supabase } = await assertAdmin();

    const { error } = await supabase
      .from("service_coordinators")
      .update({
        is_primary: readBoolean(formData, "is_primary"),
        receives_new_request_notifications: readBoolean(
          formData,
          "receives_new_request_notifications",
        ),
      })
      .eq("service_id", serviceId)
      .eq("coordinator_id", coordinatorId);

    if (error) {
      throw error;
    }

    revalidatePath("/admin/servizi");
    revalidatePath(redirectTo);
    redirectWithMessage(
      redirectTo,
      "success",
      "Assegnazione aggiornata.",
    );
  } catch (error) {
    redirectWithMessage(
      redirectTo,
      "error",
      handleActionError(error, "Impossibile aggiornare l'assegnazione."),
    );
  }
}

export async function removeServiceCoordinatorAction(formData: FormData) {
  const serviceId = readRequiredString(formData, "service_id");
  const coordinatorId = readRequiredString(formData, "coordinator_id");
  const redirectTo = readRedirectPath(
    formData,
    `/admin/servizi/${serviceId}`,
  );

  try {
    const { supabase } = await assertAdmin();

    const { error } = await supabase
      .from("service_coordinators")
      .delete()
      .eq("service_id", serviceId)
      .eq("coordinator_id", coordinatorId);

    if (error) {
      throw error;
    }

    revalidatePath("/admin/servizi");
    revalidatePath(redirectTo);
    redirectWithMessage(
      redirectTo,
      "success",
      "Collegamento coordinatore rimosso.",
    );
  } catch (error) {
    redirectWithMessage(
      redirectTo,
      "error",
      handleActionError(
        error,
        "Impossibile rimuovere il coordinatore dal servizio.",
      ),
    );
  }
}
