import { FlashMessage } from "@/components/admin/flash-message";
import { PageHeader } from "@/components/admin/page-header";
import { PctoStudentsTable } from "@/components/coordinator/pcto-students-table";
import { requireCoordinator } from "@/lib/auth/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Tables } from "@/lib/supabase/database.types";

type CoordinatorPctoPageProps = {
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

type AssignedService = {
  name: string;
};

function getAssignedService(assignment: {
  services: AssignedService | AssignedService[] | null;
}) {
  return Array.isArray(assignment.services)
    ? assignment.services[0]
    : assignment.services;
}

export default async function CoordinatorPctoPage({
  searchParams,
}: CoordinatorPctoPageProps) {
  const [{ coordinator, supabase }, params] = await Promise.all([
    requireCoordinator("/coordinatore/pcto"),
    searchParams,
  ]);

  if (!coordinator) {
    throw new Error("Coordinatore non disponibile.");
  }

  const { data: assignments, error: assignmentsError } = await supabase
    .from("service_coordinators")
    .select("services(name)")
    .eq("coordinator_id", coordinator.id);

  if (assignmentsError) {
    throw assignmentsError;
  }

  const assignedServiceNames = (assignments ?? [])
    .map((assignment) => getAssignedService(assignment)?.name ?? null)
    .filter((name): name is string => Boolean(name))
    .sort((left, right) => left.localeCompare(right, "it"));

  let students: Tables<"pcto_student_registrations">[] = [];

  if (assignedServiceNames.length > 0) {
    const adminSupabase = createAdminClient();
    const { data, error } = await adminSupabase
      .from("pcto_student_registrations")
      .select("*")
      .in("assigned_service_name", assignedServiceNames)
      .order("student_last_name", { ascending: true })
      .order("student_first_name", { ascending: true });

    if (error) {
      throw error;
    }

    students = data ?? [];
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="PCTO importato"
        title="Studenti PCTO"
        description="Consulta e aggiorna gli studenti importati dal foglio PCTO per i servizi collegati a questo coordinatore."
      />

      <FlashMessage error={params.error ?? null} success={params.success ?? null} />

      <PctoStudentsTable
        assignedServiceNames={assignedServiceNames}
        students={students}
      />
    </div>
  );
}
