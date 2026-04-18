import { FlashMessage } from "@/components/admin/flash-message";
import { PageHeader } from "@/components/admin/page-header";
import { RequestsAdminTable } from "@/components/admin/requests-admin-table";
import { requireAdmin } from "@/lib/auth/admin";

type AdminRequestsPageProps = {
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

export default async function AdminRequestsPage({
  searchParams,
}: AdminRequestsPageProps) {
  const [{ supabase }, params] = await Promise.all([
    requireAdmin("/admin/richieste"),
    searchParams,
  ]);

  const { data: requests, error } = await supabase
    .from("certificate_requests")
    .select(
      "id, student_first_name, student_last_name, school_name_snapshot, service_name_snapshot, status, submitted_at",
    )
    .order("submitted_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Admin"
        title="Richieste"
        description="Consulta tutte le richieste ricevute dal form pubblico, con ricerca, ordinamento e accesso al dettaglio della pratica."
      />

      <FlashMessage error={params.error ?? null} success={params.success ?? null} />

      <RequestsAdminTable requests={requests} />
    </div>
  );
}
