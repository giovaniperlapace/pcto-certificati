import Link from "next/link";

export default function RequestCertificateConfirmationPage() {
  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-24">
      <section className="mx-auto w-full max-w-3xl rounded-[2rem] border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="space-y-5">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">
            Richiesta inviata
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-zinc-950">
            Abbiamo ricevuto la tua richiesta.
          </h1>
          <p className="text-base leading-7 text-zinc-600">
            La richiesta e&apos; stata registrata correttamente. I coordinatori del
            servizio la prenderanno in carico e proseguiranno con la revisione nei
            prossimi passaggi del flusso.
          </p>
          <p className="text-sm leading-6 text-zinc-500">
            Se hai bisogno di correggere dati importanti, evita di inviare subito un
            duplicato: contatta prima l&apos;associazione o attendi l&apos;esito della
            verifica.
          </p>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/richiedi-certificato"
            className="rounded-full bg-zinc-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-800"
          >
            Invia un&apos;altra richiesta
          </Link>
          <Link
            href="/"
            className="rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm font-medium text-zinc-700 transition hover:border-zinc-950 hover:text-zinc-950"
          >
            Torna alla home
          </Link>
        </div>
      </section>
    </main>
  );
}
