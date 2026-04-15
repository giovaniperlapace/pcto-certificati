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
  ] = await Promise.all([
    supabase.from("coordinators").select("*").order("last_name", { ascending: true }),
    supabase.from("service_coordinators").select("coordinator_id, service_id"),
  ]);

  if (coordinatorsError) {
    throw coordinatorsError;
  }

  if (assignmentsError) {
    throw assignmentsError;
  }

  const assignedServicesCountByCoordinator = assignments.reduce<
    Record<string, number>
  >((accumulator, assignment) => {
    accumulator[assignment.coordinator_id] =
      (accumulator[assignment.coordinator_id] ?? 0) + 1;

    return accumulator;
  }, {});

  const coordinatorsWithCounts = coordinators.map((coordinator) => ({
    ...coordinator,
    assignedServicesCount: assignedServicesCountByCoordinator[coordinator.id] ?? 0,
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
