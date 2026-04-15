import { FlashMessage } from "@/components/admin/flash-message";
import { PageHeader } from "@/components/admin/page-header";
import { SchoolsAdminTable } from "@/components/admin/schools-admin-table";
import { requireAdmin } from "@/lib/auth/admin";

type SchoolsPageProps = {
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

export default async function SchoolsPage({ searchParams }: SchoolsPageProps) {
  const [{ supabase }, params] = await Promise.all([
    requireAdmin("/admin/scuole"),
    searchParams,
  ]);

  const { data: schools, error } = await supabase
    .from("schools")
    .select("*")
    .order("short_name", { ascending: true });

  if (error) {
    throw error;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Admin"
        title="Scuole"
        description="Gestisci l'anagrafica scuole in una tabella unica con filtri rapidi su recapiti, referente e preferenze di invio."
      />

      <FlashMessage error={params.error ?? null} success={params.success ?? null} />

      <SchoolsAdminTable schools={schools} />
    </div>
  );
}
