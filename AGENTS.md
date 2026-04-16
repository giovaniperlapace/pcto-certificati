# AGENTS.md

## Progetto

MVP web app per:

- ricevere richieste pubbliche di certificato PCTO o volontariato
- far revisionare le richieste ai coordinatori
- generare certificati PDF
- inviare i certificati via email a studenti e, se previsto, a scuola e docente

## Stack deciso

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Supabase

## Stato attuale

### Fase 1 completata

Bootstrap app completato.

Gia' presente:

- app Next.js inizializzata
- lint e build funzionanti
- struttura App Router minima presente

### Fase 2 completata

Base Supabase completata.

Gia' fatto:

- Supabase CLI inizializzata nella cartella `supabase/`
- progetto Supabase remoto collegato
- migration iniziale applicata al database remoto
- tipi TypeScript generati dal database remoto
- base auth SSR pronta con client browser/server
- `proxy.ts` presente per refresh sessione
- route callback Magic Link presente in `app/auth/callback/route.ts`

### Fase 3 completata

Area admin e accessi interni completati in una versione gia' usabile e pushata su GitHub.

Gia' presente:

- login Magic Link in `app/entra/`
- scelta del tipo di accesso nel form login: `coordinatore` oppure `admin`
- valore predefinito del form login = `coordinatore`
- redirect post-login coerente:
  - admin -> `/admin`
  - coordinatore -> `/coordinatore`
- callback Magic Link in `app/auth/callback/route.ts` con riallineamento automatico di `coordinators.auth_user_id` quando l'email coincide ma l'id auth e' cambiato
- guard admin e coordinatore server-side in `lib/auth/admin.ts`
- layout admin con navigazione e logout
- dashboard admin
- prima dashboard coordinatore in `app/coordinatore/page.tsx`
- CRUD scuole
- CRUD servizi
- CRUD coordinatori
- visualizzazione anagrafiche admin in tabelle piu' ricche, con filtri, ordinamento e modal di inserimento/modifica
- pulsante rosso di eliminazione con conferma nelle modal di modifica di scuole, servizi e coordinatori
- gestione relazione `service_coordinators`
- possibilita' di promuovere un coordinatore ad admin dalla UI coordinatori
- sincronizzazione `auth.users` + `user_roles` quando un coordinatore riceve o perde il privilegio admin
- logout funzionante sia da area admin sia da area coordinatore

Commit rilevanti:

- `23d5e37` `Build admin management area`
- `8578648` `Refactor admin anagrafiche to table-based management UI`
- `ff72535` `Improve admin tables and role-based access flows`

### Fase 4 completata in una prima versione usabile

Il flusso pubblico studente end-to-end ora esiste in una prima versione gia'
utilizzabile.

Gia' presente:

- pagina pubblica in `app/richiedi-certificato/`
- validazione server-side in `app/richiedi-certificato/actions.ts`
- creazione di `certificate_requests` da UI pubblica
- salvataggio snapshot di scuola e servizio nella richiesta
- gestione selezione da anagrafiche attive
- supporto a scuola o servizio non presenti in elenco tramite inserimento manuale
- controlli anti-duplicato
- misure anti-abuso minime:
  - honeypot
  - hash IP
  - rate limit base sui submit ravvicinati
- evento iniziale in `request_events`
- registrazione notifiche in `email_deliveries` per coordinatori o admin
- pagina di conferma submit in `app/richiedi-certificato/conferma/`

### Fase 5 completata in una prima versione usabile

L'area coordinatore consente una revisione reale delle richieste in modo gia'
usabile.

Gia' presente:

- layout coordinatore dedicato in `app/coordinatore/layout.tsx`
- dashboard coordinatore con viste per stato in `app/coordinatore/page.tsx`
- filtro per servizio assegnato
- lista richieste limitata ai soli servizi del coordinatore
- dettaglio richiesta in `app/coordinatore/richieste/[id]/page.tsx`
- possibilita' di modificare i dati della richiesta prima della decisione
- azioni server-side per:
  - salvataggio modifica
  - approvazione
  - rifiuto con motivazione
- timeline eventi richiesta
- visibilita' delle `email_deliveries` gia' registrate
- controllo concorrenza tra coordinatori con verifica di `updated_at`
- blocco chiusura doppia consentendo approva/rifiuta solo su richieste `submitted`

### Fase 6 avviata in una prima versione tecnica

Il ciclo post-approvazione ora esiste davvero, ma va ancora validato meglio
end-to-end su casi reali.

Gia' presente:

- generazione reale del PDF
- download del certificato dal dettaglio richiesta
- invio finale email a studente, scuola e docente
- transizione finale a `completed` o `delivery_failed`
- retry manuale della consegna finale per richieste `approved` o `delivery_failed`
- registrazione esiti finali in `request_events` ed `email_deliveries`
- bucket storage privato `certificate-pdfs`
- provider email MVP via Gmail SMTP con `nodemailer`
- integrazione grafica di:
  - `public/certificate-assets/header.png`
  - `public/certificate-assets/footer.png`
  - `public/certificate-assets/signature.png`
- testi base certificato derivati dai template legacy RMarkdown
- possibilita' opzionale di personalizzare intestazione e corpo del certificato
  per la singola richiesta senza interrompere il flusso standard

Da rifinire / validare meglio nella fase successiva:

- QA manuale completo con invio reale controllato
- rifinitura impaginazione e testi istituzionali finali
- verifica robustezza deliverability Gmail in produzione

## Stato dati reale su Supabase

Alla data del `2026-04-16` risultano:

- `services`: 69
- `services` attivi: 4
- `schools`: 40
- `schools` attive: 40
- `coordinators`: 31
- `coordinators` attivi: 31
- `service_coordinators`: 4
- `services` attivi con almeno un coordinatore attivo assegnato: 4
- `user_roles`: 1
- `certificate_requests`: 1
- `certificate_requests` in `approved`: 1

Note importanti:

- i servizi sono stati importati tutti `inactive`
- questo e' voluto: il database non consente servizi attivi senza almeno un coordinatore attivo collegato
- le scuole sono state importate con `send_certificate_to_school_by_default = false`
- le scuole sono state importate con `send_certificate_to_teacher_by_default = false`
- esiste gia' almeno una richiesta reale inserita e approvata
- i flussi pubblico e coordinatore sono quindi gia' stati provati su dati reali almeno in un caso

## Import gia' eseguiti

### Servizi

Origine:

- `/Users/stefanolaptop/Documents/AAATemp/servizi.csv`

Esito:

- 69 servizi importati
- 5 righe saltate per indirizzo mancante
- 46 servizi risultavano `Attivo` nel CSV ma sono stati salvati `inactive` per rispettare il vincolo DB

Script creato:

- `scripts/import-services-from-csv.mjs`

Mappatura usata:

- `Servizio` -> `name`
- `Quando` -> `schedule_label`, `weekday`, `start_time`, `end_time`
- `Dove` -> `address`
- `tipo_servizio` -> `certificate_label`
- `city` -> `Roma`

### Scuole

Origine:

- `/Users/stefanolaptop/Documents/RStudio/PCTO_2024/data/scuole.xlsx`

Esito:

- 41 scuole importate
- `school_email` popolato da `mail_certificati`
- `teacher_name` e `teacher_email` lasciati vuoti
- 2 `full_name` duplicati nel file sorgente sono stati resi univoci aggiungendo il `short_name` tra parentesi

Script creato:

- `scripts/import-schools-from-xlsx.py`

Mappatura usata:

- `Scuola` -> `short_name`
- `denominazione_scuola` -> `full_name`
- `mail_certificati` -> `school_email`

## Auth e ruoli

### Supabase project

- nome progetto: `pcto-certificati`
- project ref: `dcxwxtyuqdzdyprlhfyt`

### Deploy web

- URL Vercel produzione: `https://pcto-certificati.vercel.app/`

### Configurazione consigliata in Supabase

- `Site URL`: `https://pcto-certificati.vercel.app`
- redirect consentiti:
  - `https://pcto-certificati.vercel.app/auth/callback`
  - `http://localhost:3000/auth/callback`
  - `http://127.0.0.1:3000/auth/callback`

### Utenti auth verificati

Al momento esistono in `auth.users`:

- `info@giovaniperlapace.it`
- `steorlando@gmail.com`

### Stato Magic Link

Situazione attuale:

- la probe via `signInWithOtp` ora risponde senza errore
- quindi il Magic Link al momento non risulta bloccato lato API Supabase
- il callback ora gestisce correttamente il redirect finale leggendo e decodificando i cookie di `next`
- login admin riuscito -> redirect diretto a `/admin`
- login coordinatore riuscito -> redirect diretto a `/coordinatore`

Attenzione:

- in una sessione precedente il Magic Link falliva con `500 Error sending magic link email`
- il problema sembrava legato alla configurazione SMTP custom di Supabase Auth
- se il problema si ripresenta, controllare prima `Authentication > SMTP Settings`

### Ruoli admin

`user_roles` usa `auth.users.id`, non la tabella `coordinators`.

Questo significa:

- per accedere a `/admin` serve una riga in `user_roles` collegata all'id dell'utente auth
- creare un coordinatore con la stessa email non basta a renderlo admin
- per concedere accesso admin dall'app, nella modal coordinatore va attivata l'opzione che abilita anche l'accesso admin

### Ruoli coordinatore

`coordinators` usa il campo `auth_user_id` per legare il coordinatore all'utente Supabase Auth.

Questo significa:

- per accedere a `/coordinatore` serve un record in `coordinators` attivo
- idealmente `coordinators.auth_user_id` deve puntare all'utente reale in `auth.users`
- se l'utente auth e il coordinatore hanno la stessa email ma `auth_user_id` e' vecchio, il callback ora prova a riallinearlo automaticamente

Caso gia' incontrato e risolto:

- `steorlando@gmail.com` aveva un `auth_user_id` non allineato
- il record e' stato corretto su Supabase
- il codice ora e' piu' robusto per evitare che il problema si ripresenti

## Struttura Supabase gia' presente

### Tabelle create

- `school_years`
- `schools`
- `services`
- `coordinators`
- `service_coordinators`
- `user_roles`
- `certificate_requests`
- `request_events`
- `email_deliveries`

### RLS gia' presente

- lettura pubblica solo per anagrafiche attive essenziali
- accesso coordinatore limitato ai servizi assegnati
- accesso admin pieno via `user_roles`

### File chiave Supabase

- `supabase/migrations/20260415124941_init_mvp_schema.sql`
- `supabase/migrations/20260416094000_allow_manual-school-and-service-submissions.sql`
- `supabase/migrations/20260416234500_add_certificate_text_overrides.sql`
- `supabase/config.toml`
- `lib/supabase/database.types.ts`

## Scelte di dominio gia' fissate

- la richiesta di certificato e' l'entita' principale
- non esiste una tabella `students` per l'MVP
- tipi certificato: `pcto`, `volontariato`
- ogni servizio deve avere almeno un coordinatore attivo
- stato richieste:
  - `submitted`
  - `approved`
  - `rejected`
  - `completed`
  - `delivery_failed`
  - `cancelled`
- anno scolastico attivo iniziale gia' inserito: `2025/2026`

## File applicativi gia' importanti

### App / auth / admin

- `app/layout.tsx`
- `app/page.tsx`
- `app/entra/page.tsx`
- `app/entra/actions.ts`
- `app/auth/callback/route.ts`
- `app/admin/layout.tsx`
- `app/admin/page.tsx`
- `app/admin/actions.ts`
- `app/admin/scuole/page.tsx`
- `app/admin/servizi/page.tsx`
- `app/admin/servizi/[serviceId]/page.tsx`
- `app/admin/coordinatori/page.tsx`
- `app/richiedi-certificato/page.tsx`
- `app/richiedi-certificato/actions.ts`
- `app/richiedi-certificato/conferma/page.tsx`
- `app/coordinatore/layout.tsx`
- `app/coordinatore/actions.ts`
- `app/coordinatore/page.tsx`
- `app/coordinatore/richieste/[id]/page.tsx`
- `app/coordinatore/richieste/[id]/certificato/route.ts`
- `proxy.ts`

### Componenti / utility

- `components/admin/admin-table-pattern.tsx`
- `components/admin/coordinator-search-select.tsx`
- `components/admin/flash-message.tsx`
- `components/admin/page-header.tsx`
- `components/public/filterable-select.tsx`
- `components/public/request-entity-selectors.tsx`
- `components/coordinator/request-status-badge.tsx`
- `lib/auth/admin.ts`
- `lib/certificates/content.ts`
- `lib/certificates/email.ts`
- `lib/certificates/finalize.ts`
- `lib/certificates/pdf.ts`
- `lib/coordinator/requests.ts`
- `lib/utils/form-data.ts`
- `lib/utils/request-url.ts`

### Supabase client

- `lib/supabase/env.ts`
- `lib/supabase/admin.ts`
- `lib/supabase/client.ts`
- `lib/supabase/server.ts`
- `lib/supabase/proxy.ts`
- `lib/supabase/database.types.ts`

### Script import

- `scripts/import-coordinators-from-csv.mjs`
- `scripts/import-services-from-csv.mjs`
- `scripts/import-schools-from-xlsx.py`

## Legacy da tenere come riferimento di dominio

Cartella:

- `vecchio_progetto/`

Pattern gia' estratti dal legacy:

- differenza tra certificato PCTO e volontariato
- naming scuole con nome breve e nome formale
- presenza di testi istituzionali per certificati ed email
- uso di snapshot scuola/servizio dentro la richiesta

Il file Excel scuole conferma il naming legacy:

- `Scuola`
- `denominazione_scuola`
- `mail_certificati`

## Git / remoto

- repository Git inizializzato
- remote `origin` = `https://github.com/giovaniperlapace/pcto-certificati.git`
- branch principale = `main`
- ultimo commit pushato: `ff72535`

Nota pratica:

- il push `git push origin main` puo' fallire usando vecchie credenziali cached
- workaround gia' usato con successo:
  - `TOKEN=$(gh auth token) && git push "https://x-access-token:${TOKEN}@github.com/giovaniperlapace/pcto-certificati.git" main`

Nota pratica 2:

- `.gitignore` ora esclude file locali non da pushare come:
  - `.codex/`
  - `__pycache__/`
  - `*.pyc`

## Variabili ambiente attese

Definite in:

- `.env.local`
- `.env.example`

Variabili attese:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GMAIL_USER`
- `GMAIL_APP_PASSWORD`

Non committare mai segreti nuovi oltre quelli gia' presenti localmente.

## Documenti da leggere prima di continuare

- `piano-implementazione-mvp-certificati.md`
- `primo_prompt.txt`
- questo file

## Prossimi passi consigliati

Ordine sensato:

1. eseguire un ciclo di QA manuale completo da submit pubblico fino alla consegna finale
2. verificare su casi reali il comportamento di email a studente, scuola e docente
3. rifinire i testi finali dei certificati `pcto` e `volontariato` se necessario
4. valutare eventuali limiti pratici di Gmail SMTP per il carico reale MVP
5. passare alla Fase 7 di hardening e QA

### Fase 6 stato attuale

La Fase 6 ora copre gia':

- generazione PDF server-side
- salvataggio del PDF in storage privato
- download del PDF dal dettaglio richiesta
- invio email finale a studente, scuola e docente
- aggiornamento stato finale richiesta e log invii
- personalizzazione opzionale del testo del certificato per singola richiesta

Note operative:

- il flusso standard resta lineare: il coordinatore puo' approvare e inviare
  senza toccare il testo del certificato
- la personalizzazione del testo e' opzionale e vale solo per quella richiesta
- il PDF finale usa gli asset grafici attualmente presenti in
  `public/certificate-assets/`

Prima di considerare chiusa davvero la Fase 6 conviene verificare:

- testo finale dei certificati `pcto` e `volontariato`
- resa PDF su piu' richieste reali
- invio con allegato su caselle reali di test
- fallback o piano B se Gmail SMTP mostra limiti pratici

Punti tecnici gia' adottati in Fase 6:

1. template PDF `pcto` e `volontariato` con `pdf-lib`
2. generazione server-side al momento dell'approvazione finale
3. salvataggio in storage privato + `pdf_storage_path`
4. invio email con allegato tramite Gmail SMTP
5. aggiornamento `email_deliveries`
6. passaggio finale a `completed` o `delivery_failed`

## Regole operative per le prossime sessioni

- minimizzare i diff
- non introdurre dipendenze inutili
- tenere la logica sensibile lato server
- riusare i tipi generati in `lib/supabase/database.types.ts`
- quando possibile, mantenere la UI admin nel pattern tabelle/modal gia' introdotto invece di tornare a form sparsi nella pagina
- dopo modifiche significative eseguire sempre:
  - `npm run lint`
  - `npm run build`
- se cambia lo schema DB:
  - creare nuova migration Supabase CLI
  - applicarla con `supabase db push`
  - rigenerare i tipi con `supabase gen types typescript --linked --schema public > lib/supabase/database.types.ts`

## Se si riparte da zero in una nuova postazione

Ordine consigliato:

1. clonare repo
2. leggere questo file
3. leggere `piano-implementazione-mvp-certificati.md`
4. verificare `.env.local`
5. eseguire `npm install`
6. eseguire `npm run lint`
7. eseguire `npm run build`
8. verificare accesso Supabase CLI e `gh auth status`
9. controllare lo stato dati reale su Supabase
10. ripartire dalla Fase 7 oppure rifinire/validare meglio la Fase 6, in base a cosa manca
