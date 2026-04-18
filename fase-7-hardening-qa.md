# Fase 7 - Hardening e QA

## Obiettivo

Consolidare l'MVP dopo la Fase 6 con:

- dataset locale realistico per test ripetibili
- controlli automatici di coerenza dati e sicurezza base
- validazione dei casi limite di consegna certificato

## Cosa e' stato introdotto

- `supabase/seed.sql` ora contiene dati seed idempotenti:
  - 1 anno scolastico attivo e 1 inattivo
  - 3 scuole
  - 4 servizi
  - 4 coordinatori
  - relazioni `service_coordinators`
  - 6 richieste esempio in tutti gli stati (`submitted`, `approved`, `rejected`, `completed`, `delivery_failed`, `cancelled`)
  - eventi `request_events` e log `email_deliveries`
- script automatico `scripts/phase7-hardening-checks.mjs`
- comando npm `npm run qa:hardening`

## Esecuzione consigliata in locale

1. Avviare i controlli hardening:

```bash
npm run qa:hardening
```

## Nota importante su reset e dati

- non usare `supabase db reset` su ambienti con dati reali da preservare
- i seed locali restano disponibili solo per ambienti di test dedicati e isolati

## Criteri di esito dei controlli

Lo script segnala KO se trova anomalie bloccanti, tra cui:

- numero di anni scolastici attivi diverso da 1
- servizi attivi senza coordinatori attivi
- richieste `completed` senza PDF o senza invio completo richiesto
- richieste `approved` con metadati revisione incompleti
- richieste `delivery_failed` senza evidenza di fallimento PDF/email
- bucket `certificate-pdfs` mancante o pubblico
- visibilita' anonima non prevista su tabelle riservate

## Nota operativa

I seed usano identificativi UUID fissi e nomi con prefisso `[SEED]`, per rendere le riesecuzioni prevedibili e distinguere chiaramente i dati di test.
