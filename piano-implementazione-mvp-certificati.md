# Piano Implementazione MVP Certificati

## Obiettivo

Realizzare una web app MVP che:

- riceve richieste pubbliche di certificato senza login
- permette ad admin di gestire scuole, servizi e coordinatori
- permette ai coordinatori di accedere con Supabase Magic Link
- consente ai coordinatori di approvare o rigettare le richieste
- genera il certificato PDF dopo approvazione
- invia email a coordinatori, studente e, se presenti, scuola e docente

## Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Supabase

## Stato avanzamento al 2026-04-16

- Fase 1 completata
- Fase 2 completata
- Fase 3 completata
- Fase 4 completata in una prima versione usabile
- Fase 5 completata in una prima versione usabile
- Fase 6 avviata in una prima versione tecnica
- Fase 7 non ancora iniziata

## Regole di progetto

- implementare solo il necessario per l'MVP
- minimizzare i diff
- riusare naming e logiche del dominio emerse dal legacy R
- tenere tutta la logica sensibile server-side
- non esporre direttamente al client accessi Supabase privilegiati
- evitare nuove dipendenze salvo necessità concreta

## Requisiti di dominio da preservare

Dal progetto legacy vanno mantenuti questi pattern:

- due tipi di certificato: `pcto` e `volontariato`
- le scuole hanno un nome breve e un nome formale
- per il PCTO il certificato include le ore
- il certificato contiene data, anno scolastico, studente, classe, scuola, testo istituzionale, firma e intestazione
- l'email finale va sempre allo studente
- se disponibile, per il PCTO va inviata copia anche alla scuola
- scuola e servizio devono essere salvati anche come snapshot nella richiesta

## Modello dati

### Tabelle

#### `school_years`

- `id`
- `label`
- `starts_on`
- `ends_on`
- `is_active`
- `created_at`
- `updated_at`

#### `schools`

- `id`
- `short_name`
- `full_name`
- `school_email`
- `teacher_name`
- `teacher_email`
- `send_certificate_to_school_by_default`
- `send_certificate_to_teacher_by_default`
- `is_active`
- `notes`
- `created_at`
- `updated_at`

#### `services`

- `id`
- `name`
- `weekday`
- `start_time`
- `end_time`
- `schedule_label`
- `address`
- `city`
- `certificate_label`
- `is_active`
- `created_at`
- `updated_at`

#### `coordinators`

- `id`
- `auth_user_id`
- `first_name`
- `last_name`
- `email`
- `phone`
- `is_active`
- `last_login_at`
- `created_at`
- `updated_at`

#### `service_coordinators`

- `service_id`
- `coordinator_id`
- `is_primary`
- `receives_new_request_notifications`
- `created_at`

Vincoli:

- chiave unica su `service_id + coordinator_id`
- ogni servizio deve avere almeno un coordinatore attivo

#### `certificate_requests`

- `id`
- `school_year_id`
- `service_id`
- `school_id`
- `certificate_type`
- `status`
- `student_first_name`
- `student_last_name`
- `student_email`
- `class_label`
- `hours_requested`
- `hours_approved`
- `student_notes`
- `school_name_snapshot`
- `teacher_name_snapshot`
- `teacher_email_snapshot`
- `service_name_snapshot`
- `service_schedule_snapshot`
- `service_address_snapshot`
- `send_to_school`
- `send_to_teacher`
- `submitted_at`
- `reviewed_at`
- `reviewed_by_coordinator_id`
- `approved_at`
- `rejected_at`
- `rejection_reason`
- `decision_notes`
- `certificate_heading_text`
- `certificate_body_text`
- `coordinator_notified_at`
- `pdf_storage_path`
- `pdf_generated_at`
- `student_emailed_at`
- `school_emailed_at`
- `teacher_emailed_at`
- `duplicate_of_request_id`
- `submission_ip_hash`
- `created_at`
- `updated_at`

#### `certificate_templates`

- `certificate_type`
- `heading_template`
- `body_template`
- `created_at`
- `updated_at`

#### `request_events`

- `id`
- `request_id`
- `actor_type`
- `actor_user_id`
- `event_type`
- `payload`
- `created_at`

#### `email_deliveries`

- `id`
- `request_id`
- `recipient_type`
- `recipient_email`
- `template_key`
- `status`
- `attempt_count`
- `provider_message_id`
- `error_message`
- `last_attempt_at`
- `sent_at`
- `created_at`

#### `user_roles`

- `user_id`
- `role`
- `created_at`

Uso:

- contiene solo gli admin

### Entità principale

La richiesta è l'entità principale. Non serve una tabella `students` per l'MVP.

Motivi:

- semplifica il modello
- conserva lo snapshot storico usato per il certificato
- evita merge e deduplica di profili studente

### Stati richiesta

Usare questi stati:

- `submitted`
- `approved`
- `rejected`
- `completed`
- `delivery_failed`
- `cancelled`

Significato:

- `submitted`: richiesta ricevuta e in attesa di revisione
- `approved`: approvata, pronta o in corso di generazione/invio
- `rejected`: rifiutata con motivazione
- `completed`: PDF generato e email allo studente inviata con successo
- `delivery_failed`: errore su PDF o invio email dopo approvazione
- `cancelled`: chiusura amministrativa eccezionale

## Autenticazione e autorizzazione

### Pubblico

- nessun login
- può solo inviare richieste tramite server action o route handler
- nessun accesso diretto alle tabelle Supabase dal client

### Coordinatore

- login con Supabase Magic Link
- vede solo richieste dei servizi a cui è assegnato
- può approvare o rigettare solo richieste dei propri servizi

### Admin

- login con Supabase Magic Link
- ruolo applicativo gestito via `user_roles`
- accesso pieno a CRUD anagrafiche, template certificati e supervisione richieste

### RLS

- pubblico: nessuna read diretta
- coordinatore: accesso solo alle richieste dei propri servizi
- admin: accesso completo alle tabelle applicative
- service role: usato solo per job server-side, storage e invii email

## Struttura route

### Pubblico

- `/richiedi-certificato`
- `/richiedi-certificato/conferma`

### Auth

- `/entra`
- `/auth/callback`

### Coordinatore

- `/coordinatore`
- `/coordinatore/richieste/[id]`

### Admin

- `/admin`
- `/admin/scuole`
- `/admin/servizi`
- `/admin/coordinatori`
- `/admin/richieste`

## Componenti e moduli da prevedere

### Componenti UI riusabili minimi

- campi form
- select
- textarea
- status badge
- table/list view
- page header
- action bar conferma approva/rigetta

### Moduli server-side

- validazione input
- auth e ruoli
- access policy coordinatore/admin
- query Supabase per ogni area
- generazione PDF
- invio email
- logging eventi richiesta

## Strategia PDF

- usare un template React dedicato per il PDF
- prevedere due template: `pcto` e `volontariato`
- salvare il PDF in Supabase Storage privato
- salvare nel database il path e il timestamp di generazione
- consentire override opzionale di intestazione e corpo per la singola richiesta

Implementazione MVP attuale:

- generazione con `pdf-lib`
- bucket privato `certificate-pdfs`
- asset grafici in `public/certificate-assets/`
- testo standard derivato dai template legacy RMarkdown

Il certificato deve contenere:

- data di emissione
- anno scolastico attivo
- nome e cognome studente
- classe
- scuola in forma completa
- tipo di attività
- ore riconosciute
- servizio o sede, se necessario al testo
- testo istituzionale
- firma
- intestazione grafica

## Strategia email

- usare un provider transazionale semplice
- invio sempre server-side
- mantenere template separati

Implementazione MVP attuale:

- invio via Gmail SMTP con `nodemailer`
- allegato PDF in email
- retry manuale dalla UI coordinatore per richieste in `approved` o `delivery_failed`

Template necessari:

- nuova richiesta ai coordinatori del servizio
- certificato approvato allo studente
- copia certificato alla scuola
- copia certificato al docente

Regole:

- alla creazione richiesta notificare tutti i coordinatori del servizio
- dopo approvazione inviare sempre allo studente
- inviare a scuola e docente solo se email presenti e flag attivi
- tracciare ogni invio in `email_deliveries`
- prevedere retry manuale e stato `delivery_failed`

## Validazione e business rules

### Campi obbligatori richiesta pubblica

- nome
- cognome
- email studente
- classe
- scuola
- servizio
- tipo certificato
- consenso privacy

Per `pcto`:

- `hours_requested` obbligatorio

Per `volontariato`:

- `hours_requested` opzionale

### Regole

- una richiesta appartiene sempre a un anno scolastico attivo
- scuola e servizio si selezionano da anagrafiche esistenti
- ogni servizio deve avere almeno un coordinatore
- se scuola o docente non hanno email il flusso non si blocca
- una richiesta rigettata resta storica
- un nuovo invio dopo rigetto crea una nuova richiesta

### Duplicati

Bloccare o segnalare richieste duplicate nello stesso anno scolastico quando coincidono:

- email studente
- servizio
- tipo certificato
- richiesta non chiusa in modo definitivo

## Sicurezza e privacy

- raccogliere solo i dati necessari
- non rendere pubblici i PDF
- usare bucket storage privato
- salvare hash IP, non IP in chiaro
- aggiungere protezione anti-abuso sul form pubblico
- registrare eventi essenziali in `request_events`

Misure minime anti-abuso:

- honeypot
- rate limit sul submit
- validazione server-side di tutti i campi

## Piano di implementazione

### Fase 1. Bootstrap app

#### Obiettivo

Creare la base tecnica del progetto.

#### Attività principali

- inizializzare Next.js con App Router, TypeScript e Tailwind 4
- configurare Supabase client server/browser
- definire struttura cartelle
- impostare layout base e componenti UI minimi

#### Dipendenze

- nessuna

#### Output / criteri di completamento

- app avviabile in locale
- env e client Supabase configurati
- struttura route pronta

### Fase 2. Database, auth e RLS

#### Obiettivo

Mettere in piedi il backend sicuro.

#### Attività principali

- creare migration SQL per tutte le tabelle
- creare enum, foreign key, indici e vincoli
- inserire anno scolastico attivo
- configurare Magic Link
- implementare modello ruoli admin/coordinatore
- configurare RLS

#### Dipendenze

- fase 1

#### Output / criteri di completamento

- schema Supabase migrato
- Magic Link funzionante
- permessi verificati per pubblico, coordinatore e admin

### Fase 3. CRUD admin anagrafiche

#### Obiettivo

Permettere all'admin di caricare e mantenere i dati master.

#### Attività principali

- CRUD scuole
- CRUD servizi
- CRUD coordinatori
- gestione relazione molti-a-molti servizi/coordinatori
- blocco rimozione dell'ultimo coordinatore di un servizio

#### Dipendenze

- fase 2

#### Output / criteri di completamento

- admin può gestire tutte le anagrafiche
- ogni servizio ha almeno un coordinatore
- dati pronti per il form pubblico

### Fase 4. Flusso pubblico richiesta certificato

#### Obiettivo

Raccogliere richieste valide senza login.

#### Stato attuale

Gia' realizzato in una prima versione:

- pagina pubblica di richiesta
- validazione server-side
- creazione `certificate_requests`
- snapshot scuola e servizio dentro la richiesta
- supporto a scuola o servizio non presenti in elenco
- controlli anti-duplicato
- misure anti-abuso minime
- registrazione eventi in `request_events`
- registrazione delle notifiche in `email_deliveries`

#### Attività principali

- costruire il form pubblico
- validare input lato server
- salvare richiesta con snapshot di scuola e servizio
- applicare controlli anti-duplicato
- notificare i coordinatori del servizio

#### Dipendenze

- fase 3

#### Output / criteri di completamento

- lo studente invia la richiesta
- la richiesta entra in `submitted`
- i coordinatori ricevono notifica

### Fase 5. Dashboard coordinatore

#### Obiettivo

Permettere revisione e decisione sulle richieste.

#### Stato attuale

Gia' realizzato in una prima versione operativa:

- dashboard con viste per stato
- filtro per servizio assegnato
- lista richieste limitata al perimetro del coordinatore
- dettaglio richiesta
- modifica dei dati prima della decisione
- approvazione e rifiuto server-side
- controllo di concorrenza con verifica di `updated_at`
- timeline eventi e visibilita' delle consegne registrate

Restano da chiudere nelle fasi successive:

- generazione reale del PDF
- download del certificato dal dettaglio richiesta
- invio finale a studente, scuola e docente
- transizione finale a `completed` o `delivery_failed`

#### Attività principali (ho fatto qualche modifica rispetto alla prima versione del piano)

- dashboard con viste per stato
- lista richieste filtrata sui soli servizi assegnati
- dettaglio richiesta
- Possibilità di modificare i dati inseriti nella richiesta prima di generare il certificato in pdf
- Funzione per approvare la richiesta e
	- generare ed eventualmente scaricare il certificato
	- Inviare il certificato solo allo studente o anche alla scuola/prof di riferimento se disponibile il dato
	- Funzione per rifiutare la richiesta, spiegando allo studente il motivo
- gestione concorrenza tra più coordinatori sullo stesso servizio

#### Dipendenze

- fase 4

#### Output / criteri di completamento

- il coordinatore vede solo il proprio perimetro
- può approvare o rigettare
- una richiesta non può essere chiusa due volte

### Fase 6. PDF e invio finale

#### Obiettivo

Chiudere il ciclo dopo approvazione.

#### Stato attuale

Gia' disponibile in una prima versione tecnica:

- template PDF `pcto` e `volontariato`
- generazione PDF server-side
- salvataggio PDF in storage privato
- download protetto del PDF dal dettaglio richiesta
- invio email con allegato a studente, scuola e docente quando previsto
- registrazione esiti in `email_deliveries`
- aggiornamento finale a `completed` o `delivery_failed`
- personalizzazione opzionale del testo del certificato per singola richiesta
  senza interrompere il flusso standard di approvazione e invio

Da validare o rifinire meglio:

- QA manuale completo con invio reale controllato
- resa finale del layout PDF su piu' casi
- tenuta operativa di Gmail SMTP sul carico reale MVP

#### Attività principali

- creare template PDF `pcto` e `volontariato`
- generare PDF server-side
- salvare PDF in storage privato
- inviare email allo studente
- inviare copie a scuola e docente quando previsto
- tracciare invii e fallimenti

#### Dipendenze

- fase 5

#### Output / criteri di completamento

- approvazione produce PDF reale
- studente riceve email con allegato o link coerente con la scelta implementativa
- eventuali copie sono inviate correttamente
- errori di invio finiscono in `delivery_failed`
- il coordinatore puo' lasciare il testo standard oppure personalizzare
  intestazione e corpo solo per quella richiesta

### Fase 7. Hardening e QA

#### Obiettivo

Rendere l'MVP stabile e pronto al rilascio.

#### Attività principali

- completare validazioni edge case
- aggiungere seed locali
- testare flussi critici
- verificare sicurezza storage e permessi
- verificare retry invii falliti

#### Dipendenze

- fase 6

#### Output / criteri di completamento

- seed disponibili
- casi critici coperti
- MVP pronto per deploy

## Test minimi

### Unit

- validazione form pubblico
- regole anti-duplicato
- scelta destinatari email
- mapping dati certificato

### Integration

- submit richiesta pubblica
- login Magic Link
- accesso coordinatore limitato ai propri servizi
- CRUD admin
- approvazione e rigetto
- generazione PDF
- tracciamento invii email

### Manual QA

- studente invia richiesta
- coordinatore riceve notifica
- coordinatore approva
- PDF generato correttamente
- studente riceve certificato
- scuola e docente ricevono la copia quando previsto
- retry manuale da `delivery_failed`

## Dati seed consigliati

Creare seed locali con:

- 1 anno scolastico attivo
- 3 scuole
- 4 servizi
- 4 coordinatori
- relazioni molti-a-molti servizi/coordinatori
- richieste esempio in tutti gli stati

## Checklist MVP

- app Next.js avviabile
- schema Supabase completo e migrato
- Magic Link attivo
- CRUD admin funzionanti
- form pubblico funzionante
- registrazione notifica coordinatori funzionante
- dashboard coordinatore funzionante
- approvazione e rigetto funzionanti
- generazione PDF funzionante
- invio email studente funzionante
- invio opzionale a scuola e docente funzionante
- storage privato configurato
- log eventi e log email presenti
- seed e QA completati
