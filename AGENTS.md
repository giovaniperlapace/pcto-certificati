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

Base tecnica presente:

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

### Git / remoto

- repository Git inizializzato
- remote `origin` = `https://github.com/giovaniperlapace/pcto-certificati.git`
- branch principale = `main`
- ultimo commit noto della baseline iniziale: `4b897cb`
- push su GitHub gia' eseguito

## Documenti da leggere prima di continuare

### Piano principale

- `docs/piano-implementazione-mvp-certificati.md`

### File di contesto originale

- `primo_prompt.txt`

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

## Auth e URL

### Supabase project

- nome progetto: `pcto-certificati`
- project ref: `dcxwxtyuqdzdyprlhfyt`

### Deploy web

- URL Vercel produzione: `https://pcto-certificati.vercel.app/`

### Configurazione consigliata in Supabase

Usare:

- `Site URL`: `https://pcto-certificati.vercel.app`
- redirect consentiti:
  - `https://pcto-certificati.vercel.app/auth/callback`
  - `http://localhost:3000/auth/callback`
  - `http://127.0.0.1:3000/auth/callback`

## Variabili ambiente attese

Definite in:

- `.env.local`
- `.env.example`

Variabili attese:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Non committare mai segreti nuovi oltre quelli gia' presenti localmente.

## File applicativi gia' importanti

### App / auth

- `app/layout.tsx`
- `app/page.tsx`
- `app/auth/callback/route.ts`
- `proxy.ts`

### Supabase client

- `lib/supabase/env.ts`
- `lib/supabase/client.ts`
- `lib/supabase/server.ts`
- `lib/supabase/proxy.ts`
- `lib/supabase/database.types.ts`

## Legacy da tenere come riferimento di dominio

Cartella:

- `vecchio_progetto/`

Pattern gia' estratti dal legacy:

- differenza tra certificato PCTO e volontariato
- naming scuole con nome breve e nome formale
- presenza di testi istituzionali per certificati ed email
- uso di snapshot scuola/servizio dentro la richiesta

Non serve rileggere tutto il legacy ogni volta. Il piano in `docs/` riassume gia' le decisioni utili.

## Prossima fase da sviluppare

### Fase 3

Costruire l'area admin per:

- CRUD `schools`
- CRUD `services`
- CRUD `coordinators`
- gestione relazione `service_coordinators`

Obiettivi minimi della prossima sessione:

- creare route admin
- creare query server-side sicure
- creare liste e form minimi
- rispettare il vincolo: nessun servizio attivo senza coordinatore attivo

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
8. partire dalla Fase 3
