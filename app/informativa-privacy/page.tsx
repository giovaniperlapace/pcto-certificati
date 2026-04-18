import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Informativa privacy | Certificati GXP",
  description:
    "Informativa privacy per il trattamento dei dati personali raccolti tramite il modulo di richiesta certificato.",
};

const sectionClassName =
  "rounded-[2rem] border border-zinc-200 bg-white p-8 shadow-sm";

const headingClassName = "text-xl font-semibold tracking-tight text-zinc-950";
const paragraphClassName = "text-sm leading-7 text-zinc-700";
const listClassName = "list-disc space-y-2 pl-5 text-sm leading-7 text-zinc-700";

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-16">
      <section className="mx-auto w-full max-w-4xl space-y-8">
        <div className="space-y-6">
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">
              Informativa privacy
            </p>
            <h1 className="text-4xl font-semibold tracking-tight text-zinc-950 sm:text-5xl">
              Trattamento dei dati per la richiesta di certificato.
            </h1>
            <p className="max-w-3xl text-base leading-7 text-zinc-600">
              Questa informativa descrive in modo semplice come vengono trattati
              i dati personali inseriti nel modulo online per richiedere un
              certificato PCTO o di volontariato.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/richiedi-certificato"
              className="rounded-full bg-zinc-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-800"
            >
              Torna al modulo
            </Link>
            <Link
              href="/"
              className="rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm font-medium text-zinc-700 transition hover:border-zinc-950 hover:text-zinc-950"
            >
              Torna alla home
            </Link>
          </div>
        </div>

        <section className={sectionClassName}>
          <div className="space-y-8">
            <div className="space-y-3">
              <h2 className={headingClassName}>1. Titolare del trattamento</h2>
              <p className={paragraphClassName}>
              Il titolare del trattamento dei dati personali raccolti tramite
              questa applicazione è <strong>Comunità di S.Egidio ACAP APS</strong>.
              </p>
            </div>

            <div className="space-y-3">
              <h2 className={headingClassName}>2. Quali dati trattiamo</h2>
              <p className={paragraphClassName}>
                Possiamo trattare i dati inseriti dall&apos;utente nel modulo di
                richiesta, in particolare:
              </p>
              <ul className={listClassName}>
                <li>nome e cognome dello studente;</li>
                <li>indirizzo email dello studente;</li>
                <li>classe;</li>
                <li>dati relativi a scuola, servizio e tipo di certificato;</li>
                <li>
                  eventuali note inserite liberamente nel modulo e dati di recapito
                  della scuola o del docente, se previsti dalla richiesta;
                </li>
                <li>
                  dati tecnici strettamente necessari alla sicurezza del servizio,
                  come log applicativi e informazioni usate per prevenire abusi o
                  invii automatici.
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <h2 className={headingClassName}>3. Perché trattiamo i dati</h2>
              <p className={paragraphClassName}>I dati sono trattati per:</p>
              <ul className={listClassName}>
                <li>ricevere e registrare la richiesta di certificato;</li>
                <li>verificare la richiesta da parte dei coordinatori incaricati;</li>
                <li>generare il certificato richiesto in formato PDF;</li>
                <li>
                  inviare il certificato allo studente e, se previsto, alla scuola o
                  al docente;
                </li>
                <li>gestire eventuali richieste di assistenza, correzione o reinvio;</li>
                <li>
                  garantire la sicurezza tecnica del servizio e prevenire utilizzi
                  impropri.
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <h2 className={headingClassName}>4. Base giuridica del trattamento</h2>
              <p className={paragraphClassName}>
                Il trattamento è effettuato perché necessario a gestire la
                richiesta dell&apos;interessato e a fornire il certificato richiesto.
                Per l&apos;invio del modulo viene inoltre richiesto di prendere
                visione di questa informativa e di esprimere il relativo consenso.
                I dati tecnici utilizzati per la sicurezza del servizio sono
                trattati anche sulla base del legittimo interesse del titolare a
                proteggere la piattaforma e a prevenire abusi.
              </p>
            </div>

            <div className="space-y-3">
              <h2 className={headingClassName}>5. Natura del conferimento dei dati</h2>
              <p className={paragraphClassName}>
                Il conferimento dei dati contrassegnati come necessari nel modulo
                è obbligatorio per poter inviare la richiesta. In mancanza di tali
                dati non sarà possibile prendere in carico la domanda e generare
                il certificato.
              </p>
            </div>

            <div className="space-y-3">
              <h2 className={headingClassName}>6. Modalità del trattamento</h2>
              <p className={paragraphClassName}>
                I dati sono trattati con strumenti elettronici e con misure
                organizzative e tecniche adeguate a ridurre il rischio di accessi
                non autorizzati, perdita o uso improprio delle informazioni.
              </p>
            </div>

            <div className="space-y-3">
              <h2 className={headingClassName}>7. Chi può ricevere i dati</h2>
              <p className={paragraphClassName}>
                I dati possono essere conosciuti, nei limiti delle rispettive
                funzioni, da personale autorizzato e da coordinatori incaricati
                della revisione delle richieste. Possono inoltre essere trattati da
                fornitori di servizi tecnici utilizzati per il funzionamento
                dell&apos;applicazione, l&apos;archiviazione dei file e l&apos;invio delle email.
              </p>
            </div>

            <div className="space-y-3">
              <h2 className={headingClassName}>8. Conservazione dei dati</h2>
              <p className={paragraphClassName}>
                I dati sono conservati per il tempo strettamente necessario alla
                gestione della richiesta e, successivamente, per il periodo utile a
                garantire tracciabilità amministrativa, eventuale riemissione del
                certificato, gestione di contestazioni o adempimento di obblighi di
                legge.
              </p>
            </div>

            <div className="space-y-3">
              <h2 className={headingClassName}>9. Trasferimento dei dati</h2>
              <p className={paragraphClassName}>
                Alcuni servizi tecnici utilizzati per il funzionamento della
                piattaforma possono comportare trattamenti effettuati anche tramite
                fornitori informatici esterni. In tali casi il titolare adotta le
                misure contrattuali e organizzative ragionevolmente necessarie per
                garantire un livello adeguato di protezione dei dati.
              </p>
            </div>

            <div className="space-y-3">
              <h2 className={headingClassName}>10. Diritti dell&apos;interessato</h2>
              <p className={paragraphClassName}>
                Nei casi previsti dalla normativa applicabile, l&apos;interessato può
                chiedere l&apos;accesso ai dati personali, la rettifica, la
                cancellazione, la limitazione del trattamento, la portabilità dei
                dati e può opporsi al trattamento. L&apos;interessato può inoltre
                proporre reclamo al Garante per la protezione dei dati personali.
              </p>
            </div>

            <div className="space-y-3">
              <h2 className={headingClassName}>11. Decisioni automatizzate</h2>
              <p className={paragraphClassName}>
                I dati non sono utilizzati per processi decisionali interamente
                automatizzati che producano effetti giuridici o analogamente
                rilevanti per l&apos;interessato.
              </p>
            </div>

            <div className="space-y-3">
              <h2 className={headingClassName}>12. Contatti</h2>
              <p className={paragraphClassName}>
                Per richieste relative al trattamento dei dati personali è
                possibile scrivere a{" "}
                <a
                  href="mailto:info@giovaniperlapace.it"
                  className="font-medium text-zinc-950 underline underline-offset-2"
                >
                  info@giovaniperlapace.it
                </a>
                .
              </p>
            </div>

            <p className="text-xs text-zinc-500">
              Ultimo aggiornamento: 18 aprile 2026.
            </p>
          </div>
        </section>
      </section>
    </main>
  );
}
