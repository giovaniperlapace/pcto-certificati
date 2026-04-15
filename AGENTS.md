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

Area admin minima completata e gia' pushata su GitHub.

Gia' presente:

- login Magic Link in `app/entra/`
- guard admin server-side in `lib/auth/admin.ts`
- layout admin con navigazione e logout
- dashboard admin
- CRUD scuole
- CRUD servizi
- CRUD coordinatori
- gestione relazione `service_coordinators`

Commit rilevante:

- `23d5e37` `Build admin management area`

## Stato dati reale su Supabase

Alla data attuale risultano:

- `services`: 69
- `schools`: 41
- `coordinators`: 2
- `service_coordinators`: 0
- `user_roles`: 2
- `certificate_requests`: 0

Note importanti:

- i servizi sono stati importati tutti `inactive`
- questo e' voluto: il database non consente servizi attivi senza almeno un coordinatore attivo collegato
- le scuole sono state importate con `send_certificate_to_school_by_default = false`
- le scuole sono state importate con `send_certificate_to_teacher_by_default = false`

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

Attenzione:

- in una sessione precedente il Magic Link falliva con `500 Error sending magic link email`
- il problema sembrava legato alla configurazione SMTP custom di Supabase Auth
- se il problema si ripresenta, controllare prima `Authentication > SMTP Settings`

### Ruoli admin

`user_roles` usa `auth.users.id`, non la tabella `coordinators`.

Questo significa:

- per accedere a `/admin` serve una riga in `user_roles` collegata all'id dell'utente auth
- creare un coordinatore con la stessa email non basta a renderlo admin

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
- `proxy.ts`

### Componenti / utility

- `components/admin/flash-message.tsx`
- `components/admin/page-header.tsx`
- `lib/auth/admin.ts`
- `lib/utils/form-data.ts`
- `lib/utils/request-url.ts`

### Supabase client

- `lib/supabase/env.ts`
- `lib/supabase/client.ts`
- `lib/supabase/server.ts`
- `lib/supabase/proxy.ts`
- `lib/supabase/database.types.ts`

### Script import

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
- ultimo commit pushato: `23d5e37`

Nota pratica:

- il push `git push origin main` puo' fallire usando vecchie credenziali cached
- workaround gia' usato con successo:
  - `TOKEN=$(gh auth token) && git push "https://x-access-token:${TOKEN}@github.com/giovaniperlapace/pcto-certificati.git" main`

## Variabili ambiente attese

Definite in:

- `.env.local`
- `.env.example`

Variabili attese:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Non committare mai segreti nuovi oltre quelli gia' presenti localmente.

## Documenti da leggere prima di continuare

- `docs/piano-implementazione-mvp-certificati.md`
- `primo_prompt.txt`
- questo file

## Prossimi passi consigliati

Ordine sensato:

1. importare o creare i coordinatori mancanti
2. collegare i coordinatori ai servizi in `service_coordinators`
3. riattivare i servizi che devono essere `active`
4. solo dopo passare alla Fase 4

### Fase 4 prevista

Costruire il flusso pubblico studente per richiesta certificato:

- form pubblico senza login
- validazione server-side
- creazione `certificate_requests`
- notifica email ai coordinatori del servizio

## Regole operative per le prossime sessioni

- minimizzare i diff
- non introdurre dipendenze inutili
- tenere la logica sensibile lato server
- riusare i tipi generati in `lib/supabase/database.types.ts`
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
3. leggere `docs/piano-implementazione-mvp-certificati.md`
4. verificare `.env.local`
5. eseguire `npm install`
6. eseguire `npm run lint`
7. eseguire `npm run build`
8. verificare accesso Supabase CLI e `gh auth status`
9. controllare lo stato dati reale su Supabase
10. ripartire dagli import/coordinatori oppure dalla Fase 4, in base a cosa manca
