import Link from "next/link";
import { PageHeader } from "@/components/admin/page-header";
import { requireAdmin } from "@/lib/auth/admin";

async function getCount(
  table: "schools" | "services" | "coordinators" | "certificate_requests",
  filter?: { column: string; value: boolean },
) {
  const { supabase } = await requireAdmin("/admin");

  let query = supabase
    .from(table)
    .select("*", { count: "exact", head: true });

  if (filter) {
    query = query.eq(filter.column, filter.value);
  }

  const { count, error } = await query;

  if (error) {
    throw error;
  }

  return count ?? 0;
}

export default async function AdminDashboardPage() {
  const [schools, activeSchools, services, activeServices, coordinators, activeCoordinators, submittedRequests] =
    await Promise.all([
      getCount("schools"),
      getCount("schools", { column: "is_active", value: true }),
      getCount("services"),
      getCount("services", { column: "is_active", value: true }),
      getCount("coordinators"),
      getCount("coordinators", { column: "is_active", value: true }),
      getCount("certificate_requests"),
    ]);

  const cards = [
    {
      title: "Scuole",
      value: schools,
      meta: `${activeSchools} attive`,
      href: "/admin/scuole",
    },
    {
      title: "Servizi",
      value: services,
      meta: `${activeServices} attivi`,
      href: "/admin/servizi",
    },
    {
      title: "Coordinatori",
      value: coordinators,
      meta: `${activeCoordinators} attivi`,
      href: "/admin/coordinatori",
    },
    {
      title: "Richieste",
      value: submittedRequests,
      meta: "Totale record richieste",
      href: "/admin",
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Fase 3"
        title="Anagrafiche amministrative"
        description="Questa area serve a mantenere scuole, servizi, coordinatori e le loro assegnazioni. Prima di aprire il flusso pubblico, qui devono esistere dati completi e coerenti."
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Link
            key={card.title}
            href={card.href}
            className="rounded-[1.75rem] border border-zinc-200 bg-white p-6 shadow-sm transition hover:border-zinc-950"
          >
            <div className="space-y-2">
              <p className="text-sm font-medium text-zinc-600">{card.title}</p>
              <p className="text-4xl font-semibold tracking-tight text-zinc-950">
                {card.value}
              </p>
              <p className="text-sm text-zinc-500">{card.meta}</p>
            </div>
          </Link>
        ))}
      </section>

      <section className="rounded-[1.75rem] border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="space-y-3">
          <h2 className="text-xl font-semibold tracking-tight text-zinc-950">
            Prossimi passi amministrativi
          </h2>
          <ul className="space-y-2 text-sm leading-6 text-zinc-600">
            <li>
              1. Caricare le scuole con nome formale, email scuola e docente.
            </li>
            <li>2. Creare i servizi con giorno, orario e indirizzo.</li>
            <li>3. Creare i coordinatori con email valida per il Magic Link.</li>
            <li>
              4. Collegare almeno un coordinatore attivo a ogni servizio attivo.
            </li>
          </ul>
        </div>
      </section>
    </div>
  );
}
