import Link from "next/link";

type RequestCertificateConfirmationPageProps = {
  searchParams: Promise<{
    type?: string;
  }>;
};

export default async function RequestCertificateConfirmationPage({
  searchParams,
}: RequestCertificateConfirmationPageProps) {
  const params = await searchParams;
  const isPctoImportNotification = params.type === "pcto-import";

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-24">
      <section className="mx-auto w-full max-w-3xl rounded-[2rem] border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="space-y-5">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">
            {isPctoImportNotification ? "Notifica inviata" : "Richiesta inviata"}
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-zinc-950">
            {isPctoImportNotification
              ? "Abbiamo avvisato il coordinatore."
              : "Abbiamo ricevuto la tua richiesta."}
          </h1>
          <p className="text-base leading-7 text-zinc-600">
            {isPctoImportNotification
              ? "Il tuo nominativo era gia' presente nell'elenco PCTO. Abbiamo inviato una notifica al coordinatore del servizio, che potra' generare e inviare il certificato dall'area PCTO."
              : "La richiesta e' stata registrata correttamente. I coordinatori del servizio la prenderanno in carico e proseguiranno con la revisione nei prossimi passaggi del flusso."}
          </p>
          <p className="text-sm leading-6 text-zinc-500">
            {isPctoImportNotification
              ? "Se i dati non sono corretti o non ricevi aggiornamenti, contatta l'associazione indicando il tuo codice ID."
              : "Se hai bisogno di correggere dati importanti, evita di inviare subito un duplicato: contatta prima l'associazione o attendi l'esito della verifica."}
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
