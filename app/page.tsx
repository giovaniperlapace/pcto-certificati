import Image from "next/image";
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
        <div className="rounded-3xl border border-zinc-200 bg-white px-6 py-8 shadow-sm sm:px-8">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="flex flex-wrap items-center gap-8 sm:gap-12">
              <a
                href="https://www.giovaniperlapace.it"
                target="_blank"
                rel="noopener noreferrer"
                className="transition hover:opacity-90"
                aria-label="Vai al sito Giovani per la Pace"
              >
                <Image
                  src="/loghi/logo_gxp.png"
                  alt="Logo Giovani per la Pace"
                  width={280}
                  height={120}
                  className="h-20 w-auto object-contain sm:h-24"
                  priority
                />
              </a>
              <a
                href="https://www.santegidio.org"
                target="_blank"
                rel="noopener noreferrer"
                className="transition hover:opacity-90"
                aria-label="Vai al sito Comunità di Sant'Egidio"
              >
                <Image
                  src="/loghi/logo_cse.png"
                  alt="Logo Comunità di Sant'Egidio"
                  width={280}
                  height={120}
                  className="h-20 w-auto object-contain sm:h-24"
                  priority
                />
              </a>
            </div>

            <Link
              href="/entra?next=/coordinatore&access_mode=coordinator"
              className="whitespace-nowrap rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm font-medium text-zinc-700 transition hover:border-zinc-950 hover:text-zinc-950"
            >
              Area coordinatori
            </Link>
          </div>
        </div>

        <div className="space-y-5">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-zinc-500">
            Certificati GXP
          </p>
          <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-zinc-950 sm:text-6xl">
            Gestione certificati PCTO e volontariato.
          </h1>
          <p className="max-w-3xl text-base leading-7 text-zinc-600 sm:text-lg">
            Questa web app e&apos; dedicata agli studenti di Roma che hanno svolto
            attivita&apos; di volontariato o PCTO con la Comunita&apos; di Sant&apos;Egidio
            e non hanno ancora ricevuto il certificato finale. Da qui puoi
            inviare la richiesta in modo semplice e rapido.
          </p>
        </div>

        <FlashMessage
          error={
            params.auth === "forbidden"
              ? "L&apos;utente autenticato non ha il profilo richiesto per questa area."
              : null
          }
        />

        <div className="flex flex-wrap gap-3">
          <Link
            href="/richiedi-certificato"
            className="rounded-full bg-zinc-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-800"
          >
            Richiedi un certificato
          </Link>
        </div>
      </section>
    </main>
  );
}
