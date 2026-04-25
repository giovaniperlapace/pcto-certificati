"use client";

import Link from "next/link";
import { useState } from "react";
import {
  submitCertificateRequestAction,
  submitImportedPctoCertificateRequestAction,
} from "@/app/richiedi-certificato/actions";
import { CertificateTypeHoursFields } from "@/components/public/certificate-type-hours-fields";
import { RequestEntitySelectors } from "@/components/public/request-entity-selectors";
import { PendingSubmitButton } from "@/components/ui/pending-submit-button";

type SelectOption = {
  id: string;
  label: string;
  keywords?: string;
};

type CertificateRequestFlowProps = {
  fieldClassName: string;
  initialFirstName?: string;
  initialLastName?: string;
  initialStep?: FlowStep;
  schoolOptions: SelectOption[];
  serviceOptions: SelectOption[];
};

type FlowStep = "choice" | "volontariato" | "pcto-code" | "pcto-manual";

function PrivacyConsent() {
  return (
    <label className="flex items-start gap-3 rounded-2xl border border-zinc-200 p-4 text-sm leading-6 text-zinc-600">
      <input
        required
        type="checkbox"
        name="privacy_consent"
        className="mt-1 h-4 w-4 rounded border-zinc-300 text-zinc-950 focus:ring-zinc-950"
      />
      <span>
        Confermo di aver letto l&apos;
        <Link
          href="/informativa-privacy"
          target="_blank"
          rel="noreferrer"
          className="font-medium text-zinc-950 underline underline-offset-2 transition hover:text-zinc-700"
        >
          informativa privacy
        </Link>{" "}
        e autorizzo il trattamento dei dati strettamente necessari alla gestione
        della richiesta di certificato.
      </span>
    </label>
  );
}

function HoneypotField() {
  return (
    <div className="hidden" aria-hidden="true">
      <label>
        Website
        <input type="text" name="website" tabIndex={-1} autoComplete="off" />
      </label>
    </div>
  );
}

export function CertificateRequestFlow({
  fieldClassName,
  initialFirstName = "",
  initialLastName = "",
  initialStep = "choice",
  schoolOptions,
  serviceOptions,
}: CertificateRequestFlowProps) {
  const [step, setStep] = useState<FlowStep>(initialStep);
  const [pctoFirstName, setPctoFirstName] = useState(initialFirstName);
  const [pctoLastName, setPctoLastName] = useState(initialLastName);
  const [pctoManualError, setPctoManualError] = useState<string | null>(null);

  function startPctoManualFlow() {
    if (!pctoFirstName.trim() || !pctoLastName.trim()) {
      setPctoManualError(
        "Inserisci nome e cognome prima di proseguire senza codice ID.",
      );
      return;
    }

    setPctoManualError(null);
    setStep("pcto-manual");
  }

  if (step === "choice") {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-950">
            Hai bisogno di un certificato di PCTO o di crediti per volontariato?
          </h2>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setStep("volontariato")}
            className="rounded-2xl border border-zinc-200 bg-white px-5 py-5 text-left text-lg font-semibold text-zinc-950 transition hover:border-zinc-950"
          >
            Volontariato
          </button>
          <button
            type="button"
            onClick={() => setStep("pcto-code")}
            className="rounded-2xl border border-zinc-950 bg-zinc-950 px-5 py-5 text-left text-lg font-semibold text-white transition hover:bg-zinc-800"
          >
            PCTO
          </button>
        </div>
      </div>
    );
  }

  if (step === "pcto-code") {
    return (
      <form
        action={submitImportedPctoCertificateRequestAction}
        className="space-y-6"
      >
        <div className="grid gap-5 md:grid-cols-2">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-zinc-800">Nome</span>
            <input
              required
              type="text"
              name="student_first_name"
              value={pctoFirstName}
              onChange={(event) => setPctoFirstName(event.target.value)}
              maxLength={120}
              className={fieldClassName}
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-zinc-800">Cognome</span>
            <input
              required
              type="text"
              name="student_last_name"
              value={pctoLastName}
              onChange={(event) => setPctoLastName(event.target.value)}
              maxLength={120}
              className={fieldClassName}
            />
          </label>

          <label className="block space-y-2 md:col-span-2">
            <span className="text-sm font-medium text-zinc-800">
              Codice ID assegnato
            </span>
            <input
              required
              type="text"
              name="source_code"
              maxLength={120}
              className={fieldClassName}
            />
          </label>
        </div>

        {pctoManualError ? (
          <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {pctoManualError}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <PendingSubmitButton
            className="inline-flex items-center justify-center rounded-full bg-zinc-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:hover:bg-zinc-950"
            idleLabel="Invia richiesta"
            pendingLabel="Invio richiesta in corso..."
          />
          <button
            type="button"
            onClick={startPctoManualFlow}
            className="rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm font-medium text-zinc-700 transition hover:border-zinc-950 hover:text-zinc-950"
          >
            Non ho un codice ID
          </button>
          <button
            type="button"
            onClick={() => {
              setPctoManualError(null);
              setStep("choice");
            }}
            className="rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm font-medium text-zinc-500 transition hover:border-zinc-950 hover:text-zinc-950"
          >
            Cambia scelta
          </button>
        </div>
      </form>
    );
  }

  const isPctoManual = step === "pcto-manual";

  return (
    <form action={submitCertificateRequestAction} className="space-y-6">
      {isPctoManual ? (
        <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm leading-6 text-sky-800">
          Richiesta PCTO per{" "}
          <span className="font-semibold">
            {pctoFirstName.trim()} {pctoLastName.trim()}
          </span>
          . Puoi completare gli altri dati qui sotto.
        </div>
      ) : null}

      <div className="grid gap-5 md:grid-cols-2">
        {isPctoManual ? (
          <>
            <input
              type="hidden"
              name="student_first_name"
              value={pctoFirstName.trim()}
            />
            <input
              type="hidden"
              name="student_last_name"
              value={pctoLastName.trim()}
            />
          </>
        ) : (
          <>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-zinc-800">Nome</span>
              <input
                required
                type="text"
                name="student_first_name"
                maxLength={120}
                className={fieldClassName}
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-zinc-800">Cognome</span>
              <input
                required
                type="text"
                name="student_last_name"
                maxLength={120}
                className={fieldClassName}
              />
            </label>
          </>
        )}

        <label className="block space-y-2 md:col-span-2">
          <span className="text-sm font-medium text-zinc-800">
            Email studente
          </span>
          <input
            required
            type="email"
            name="student_email"
            maxLength={320}
            placeholder="nome.cognome@scuola.it"
            className={fieldClassName}
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-zinc-800">Classe</span>
          <input
            required
            type="text"
            name="class_label"
            maxLength={80}
            placeholder="4B"
            className={fieldClassName}
          />
        </label>

        <CertificateTypeHoursFields
          fieldClassName={fieldClassName}
          fixedCertificateType={isPctoManual ? "pcto" : "volontariato"}
          hideCertificateType
        />

        <RequestEntitySelectors
          schoolOptions={schoolOptions}
          serviceOptions={serviceOptions}
        />

        <label className="block space-y-2 md:col-span-2">
          <span className="text-sm font-medium text-zinc-800">
            Note per il coordinatore
          </span>
          <textarea
            name="student_notes"
            rows={5}
            maxLength={2000}
            placeholder="Informazioni utili per identificare meglio l'attivita' svolta."
            className={fieldClassName}
          />
        </label>
      </div>

      <PrivacyConsent />
      <HoneypotField />

      <div className="flex flex-wrap gap-3">
        <PendingSubmitButton
          className="inline-flex items-center justify-center rounded-full bg-zinc-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:hover:bg-zinc-950"
          idleLabel="Invia richiesta"
          pendingLabel="Invio richiesta in corso..."
        />
        <button
          type="button"
          onClick={() => setStep(isPctoManual ? "pcto-code" : "choice")}
          className="rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm font-medium text-zinc-500 transition hover:border-zinc-950 hover:text-zinc-950"
        >
          Indietro
        </button>
      </div>
    </form>
  );
}
