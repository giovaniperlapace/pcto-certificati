import { FlashMessage } from "@/components/admin/flash-message";
import { CoordinatorsAdminTable } from "@/components/admin/coordinators-admin-table";
import { PageHeader } from "@/components/admin/page-header";
import { requireAdmin } from "@/lib/auth/admin";

type CoordinatorsPageProps = {
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

export default async function CoordinatorsPage({
  searchParams,
}: CoordinatorsPageProps) {
  const [{ supabase }, params] = await Promise.all([
    requireAdmin("/admin/coordinatori"),
    searchParams,
  ]);

  const [
    { data: coordinators, error: coordinatorsError },
    { data: assignments, error: assignmentsError },
    { data: adminRoleRows, error: adminRoleRowsError },
  ] = await Promise.all([
    supabase.from("coordinators").select("*").order("last_name", { ascending: true }),
    supabase.from("service_coordinators").select("coordinator_id, service_id"),
    supabase.from("user_roles").select("user_id").eq("role", "admin"),
  ]);

  if (coordinatorsError) {
    throw coordinatorsError;
  }

  if (assignmentsError) {
    throw assignmentsError;
  }

  if (adminRoleRowsError) {
    throw adminRoleRowsError;
  }

  const assignedServicesCountByCoordinator = assignments.reduce<
    Record<string, number>
  >((accumulator, assignment) => {
    accumulator[assignment.coordinator_id] =
      (accumulator[assignment.coordinator_id] ?? 0) + 1;

    return accumulator;
  }, {});

  const adminUserIds = new Set((adminRoleRows ?? []).map((row) => row.user_id));

  const coordinatorsWithCounts = coordinators.map((coordinator) => ({
    ...coordinator,
    assignedServicesCount: assignedServicesCountByCoordinator[coordinator.id] ?? 0,
    grantAdminAccess:
      coordinator.auth_user_id !== null && adminUserIds.has(coordinator.auth_user_id),
  }));

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Admin"
        title="Coordinatori"
        description="Consulta, filtra e aggiorna i coordinatori in una tabella unica, con evidenza immediata di attivazione e servizi collegati."
      />

      <FlashMessage error={params.error ?? null} success={params.success ?? null} />

      <CoordinatorsAdminTable coordinators={coordinatorsWithCounts} />
    </div>
  );
}
