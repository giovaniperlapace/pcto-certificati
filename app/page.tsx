import Link from "next/link";
import { FlashMessage } from "@/components/admin/flash-message";

type HomePageProps = {
  searchParams: Promise<{
    auth?: string;
  }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-24">
      <section className="mx-auto w-full max-w-5xl space-y-8">
        <div className="space-y-5">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-zinc-500">
            Certificati GXP
          </p>
          <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-zinc-950 sm:text-6xl">
            Gestione certificati PCTO e volontariato.
          </h1>
          <p className="max-w-3xl text-base leading-7 text-zinc-600 sm:text-lg">
            Base tecnica e fondazione Supabase sono pronte. L&apos;area admin e&apos;
            il prossimo perno operativo per caricare scuole, servizi e
            coordinatori.
          </p>
        </div>

        <FlashMessage
          error={
            params.auth === "forbidden"
              ? "L&apos;utente autenticato non ha il ruolo admin in Supabase."
              : null
          }
        />

        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin"
            className="rounded-full bg-zinc-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-800"
          >
            Vai all&apos;area admin
          </Link>
          <Link
            href="/entra?next=/admin"
            className="rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm font-medium text-zinc-700 transition hover:border-zinc-950 hover:text-zinc-950"
          >
            Entra con Magic Link
          </Link>
        </div>
      </section>
    </main>
  );
}
