import { FlashMessage } from "@/components/admin/flash-message";
import { PageHeader } from "@/components/admin/page-header";
import { ServicesAdminTable } from "@/components/admin/services-admin-table";
import { requireAdmin } from "@/lib/auth/admin";

type ServicesPageProps = {
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

export default async function ServicesPage({ searchParams }: ServicesPageProps) {
  const [{ supabase }, params] = await Promise.all([
    requireAdmin("/admin/servizi"),
    searchParams,
  ]);

  const [
    { data: services, error: servicesError },
    { data: assignments, error: assignmentsError },
    { data: activeCoordinators, error: activeCoordinatorsError },
  ] = await Promise.all([
    supabase.from("services").select("*").order("name", { ascending: true }),
    supabase.from("service_coordinators").select("service_id, coordinator_id"),
    supabase
      .from("coordinators")
      .select("id, first_name, last_name, email")
      .eq("is_active", true)
      .order("last_name", { ascending: true }),
  ]);

  if (servicesError) {
    throw servicesError;
  }

  if (assignmentsError) {
    throw assignmentsError;
  }

  if (activeCoordinatorsError) {
    throw activeCoordinatorsError;
  }

  const assignmentCountByService = assignments.reduce<Record<string, number>>(
    (accumulator, assignment) => {
      accumulator[assignment.service_id] =
        (accumulator[assignment.service_id] ?? 0) + 1;

      return accumulator;
    },
    {},
  );

  const servicesWithCounts = services.map((service) => ({
    ...service,
    assignmentCount: assignmentCountByService[service.id] ?? 0,
  }));

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Admin"
        title="Servizi"
        description="Crea i servizi disponibili, aggiorna rapidamente le anagrafiche dalla tabella e usa la pagina dedicata per gestire i coordinatori collegati."
      />

      <FlashMessage error={params.error ?? null} success={params.success ?? null} />

      <ServicesAdminTable
        activeCoordinators={activeCoordinators}
        services={servicesWithCounts}
      />
    </div>
  );
}
