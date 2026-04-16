"use client";

import { useState } from "react";
import { FilterableSelect } from "@/components/public/filterable-select";

type SelectOption = {
  id: string;
  label: string;
  keywords?: string;
};

type MissingSchoolData = {
  name: string;
  address: string;
  teacherName: string;
};

type MissingServiceData = {
  serviceType: string;
  district: string;
  managerName: string;
};

type RequestEntitySelectorsProps = {
  schoolOptions: SelectOption[];
  serviceOptions: SelectOption[];
};

function emptySchoolData(): MissingSchoolData {
  return {
    name: "",
    address: "",
    teacherName: "",
  };
}

function emptyServiceData(): MissingServiceData {
  return {
    serviceType: "",
    district: "",
    managerName: "",
  };
}

function normalizeModalValue(value: string) {
  return value.trim();
}

type ModalShellProps = {
  title: string;
  description: string;
  children: React.ReactNode;
  onClose: () => void;
  onConfirm: () => void;
  confirmLabel: string;
};

function ModalShell({
  title,
  description,
  children,
  onClose,
  onConfirm,
  confirmLabel,
}: ModalShellProps) {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-zinc-950/45 px-4 py-6">
      <div className="w-full max-w-xl rounded-[2rem] bg-white p-6 shadow-2xl">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">
            Inserimento manuale
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-950">
            {title}
          </h2>
          <p className="text-sm leading-6 text-zinc-600">{description}</p>
        </div>

        <div className="mt-6 space-y-4">{children}</div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-full bg-zinc-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-800"
          >
            {confirmLabel}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm font-medium text-zinc-700 transition hover:border-zinc-950 hover:text-zinc-950"
          >
            Annulla
          </button>
        </div>
      </div>
    </div>
  );
}

const fieldClassName =
  "w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-950";

export function RequestEntitySelectors({
  schoolOptions,
  serviceOptions,
}: RequestEntitySelectorsProps) {
  const [schoolMode, setSchoolMode] = useState<"existing" | "manual">("existing");
  const [serviceMode, setServiceMode] = useState<"existing" | "manual">(
    "existing",
  );
  const [missingSchool, setMissingSchool] = useState<MissingSchoolData>(
    emptySchoolData(),
  );
  const [missingService, setMissingService] = useState<MissingServiceData>(
    emptyServiceData(),
  );
  const [schoolDraft, setSchoolDraft] = useState<MissingSchoolData>(
    emptySchoolData(),
  );
  const [serviceDraft, setServiceDraft] = useState<MissingServiceData>(
    emptyServiceData(),
  );
  const [schoolModalError, setSchoolModalError] = useState<string | null>(null);
  const [serviceModalError, setServiceModalError] = useState<string | null>(null);
  const [isSchoolModalOpen, setIsSchoolModalOpen] = useState(false);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);

  function openSchoolModal() {
    setSchoolDraft(
      schoolMode === "manual" ? missingSchool : emptySchoolData(),
    );
    setSchoolModalError(null);
    setIsSchoolModalOpen(true);
  }

  function openServiceModal() {
    setServiceDraft(
      serviceMode === "manual" ? missingService : emptyServiceData(),
    );
    setServiceModalError(null);
    setIsServiceModalOpen(true);
  }

  function saveMissingSchool() {
    const normalized = {
      name: normalizeModalValue(schoolDraft.name),
      address: normalizeModalValue(schoolDraft.address),
      teacherName: normalizeModalValue(schoolDraft.teacherName),
    };

    if (!normalized.name || !normalized.address) {
      setSchoolModalError(
        "Compila almeno nome e indirizzo della scuola prima di confermare.",
      );
      return;
    }

    setMissingSchool(normalized);
    setSchoolMode("manual");
    setSchoolModalError(null);
    setIsSchoolModalOpen(false);
  }

  function saveMissingService() {
    const normalized = {
      serviceType: normalizeModalValue(serviceDraft.serviceType),
      district: normalizeModalValue(serviceDraft.district),
      managerName: normalizeModalValue(serviceDraft.managerName),
    };

    if (
      !normalized.serviceType ||
      !normalized.district ||
      !normalized.managerName
    ) {
      setServiceModalError(
        "Compila tutti i campi del servizio prima di confermare.",
      );
      return;
    }

    setMissingService(normalized);
    setServiceMode("manual");
    setServiceModalError(null);
    setIsServiceModalOpen(false);
  }

  return (
    <>
      <input type="hidden" name="school_submission_mode" value={schoolMode} />
      <input type="hidden" name="service_submission_mode" value={serviceMode} />

      <div className="space-y-5 md:col-span-2">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-medium text-zinc-800">Scuola</span>
            <button
              type="button"
              onClick={openSchoolModal}
              className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:border-zinc-950 hover:text-zinc-950"
            >
              La mia scuola non e&apos; in elenco
            </button>
          </div>

          {schoolMode === "existing" ? (
            <FilterableSelect
              name="school_id"
              options={schoolOptions}
              placeholder="Cerca e seleziona la scuola"
              noResultsMessage="Nessuna scuola trovata con questo filtro."
              invalidSelectionMessage="Seleziona una scuola dalla lista filtrata."
            />
          ) : (
            <div className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <input
                readOnly
                required
                value={missingSchool.name}
                className={fieldClassName}
              />
              <input
                type="hidden"
                name="missing_school_name"
                value={missingSchool.name}
              />
              <input
                type="hidden"
                name="missing_school_address"
                value={missingSchool.address}
              />
              <input
                type="hidden"
                name="missing_school_teacher_name"
                value={missingSchool.teacherName}
              />
              <p className="text-sm leading-6 text-zinc-700">
                <span className="font-medium text-zinc-950">Indirizzo:</span>{" "}
                {missingSchool.address}
              </p>
              <p className="text-sm leading-6 text-zinc-700">
                <span className="font-medium text-zinc-950">Docente:</span>{" "}
                {missingSchool.teacherName || "Non indicato"}
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={openSchoolModal}
                  className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:border-zinc-950 hover:text-zinc-950"
                >
                  Modifica dati scuola
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSchoolMode("existing");
                    setMissingSchool(emptySchoolData());
                  }}
                  className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:border-zinc-950 hover:text-zinc-950"
                >
                  Torna all&apos;elenco scuole
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-medium text-zinc-800">Servizio</span>
            <button
              type="button"
              onClick={openServiceModal}
              className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:border-zinc-950 hover:text-zinc-950"
            >
              Il servizio svolto non e&apos; in elenco
            </button>
          </div>

          {serviceMode === "existing" ? (
            <FilterableSelect
              name="service_id"
              options={serviceOptions}
              placeholder="Cerca e seleziona il servizio"
              noResultsMessage="Nessun servizio trovato con questo filtro."
              invalidSelectionMessage="Seleziona un servizio dalla lista filtrata."
            />
          ) : (
            <div className="space-y-3 rounded-2xl border border-sky-200 bg-sky-50 p-4">
              <input
                readOnly
                required
                value={missingService.serviceType}
                className={fieldClassName}
              />
              <input
                type="hidden"
                name="missing_service_type"
                value={missingService.serviceType}
              />
              <input
                type="hidden"
                name="missing_service_district"
                value={missingService.district}
              />
              <input
                type="hidden"
                name="missing_service_manager_name"
                value={missingService.managerName}
              />
              <p className="text-sm leading-6 text-zinc-700">
                <span className="font-medium text-zinc-950">Quartiere:</span>{" "}
                {missingService.district}
              </p>
              <p className="text-sm leading-6 text-zinc-700">
                <span className="font-medium text-zinc-950">Responsabile:</span>{" "}
                {missingService.managerName}
              </p>
              <p className="text-xs leading-5 text-zinc-600">
                In questo caso la richiesta verra&apos; inviata all&apos;admin per la
                verifica prima dell&apos;assegnazione definitiva.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={openServiceModal}
                  className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:border-zinc-950 hover:text-zinc-950"
                >
                  Modifica dati servizio
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setServiceMode("existing");
                    setMissingService(emptyServiceData());
                  }}
                  className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:border-zinc-950 hover:text-zinc-950"
                >
                  Torna all&apos;elenco servizi
                </button>
              </div>
            </div>
          )}

          <p className="text-xs leading-5 text-zinc-500">
            Vedrai solo i servizi attivi. Se il servizio manca, puoi segnalarlo
            direttamente dal pulsante qui sopra.
          </p>
        </div>
      </div>

      {isSchoolModalOpen ? (
        <ModalShell
          title="Inserisci la tua scuola"
          description="Questi dati verranno allegati alla richiesta e inviati al coordinatore del servizio selezionato."
          onClose={() => setIsSchoolModalOpen(false)}
          onConfirm={saveMissingSchool}
          confirmLabel="Conferma scuola"
        >
          <label className="block space-y-2">
            <span className="text-sm font-medium text-zinc-800">
              Nome della scuola
            </span>
            <input
              required
              type="text"
              value={schoolDraft.name}
              onChange={(event) =>
                setSchoolDraft((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
              className={fieldClassName}
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-zinc-800">
              Indirizzo della scuola
            </span>
            <input
              required
              type="text"
              value={schoolDraft.address}
              onChange={(event) =>
                setSchoolDraft((current) => ({
                  ...current,
                  address: event.target.value,
                }))
              }
              className={fieldClassName}
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-zinc-800">
              Nome del docente che segue le attivita&apos; extra scolastiche
            </span>
            <input
              type="text"
              value={schoolDraft.teacherName}
              onChange={(event) =>
                setSchoolDraft((current) => ({
                  ...current,
                  teacherName: event.target.value,
                }))
              }
              className={fieldClassName}
            />
          </label>

          {schoolModalError ? (
            <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {schoolModalError}
            </p>
          ) : null}
        </ModalShell>
      ) : null}

      {isServiceModalOpen ? (
        <ModalShell
          title="Inserisci il servizio svolto"
          description="Se il servizio non e' presente in elenco, la richiesta verra' indirizzata all&apos;admin per la verifica iniziale."
          onClose={() => setIsServiceModalOpen(false)}
          onConfirm={saveMissingService}
          confirmLabel="Conferma servizio"
        >
          <label className="block space-y-2">
            <span className="text-sm font-medium text-zinc-800">
              Tipo di servizio
            </span>
            <input
              required
              type="text"
              value={serviceDraft.serviceType}
              onChange={(event) =>
                setServiceDraft((current) => ({
                  ...current,
                  serviceType: event.target.value,
                }))
              }
              placeholder="Es. Bambini, Anziani, Senza Dimora"
              className={fieldClassName}
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-zinc-800">Quartiere</span>
            <input
              required
              type="text"
              value={serviceDraft.district}
              onChange={(event) =>
                setServiceDraft((current) => ({
                  ...current,
                  district: event.target.value,
                }))
              }
              className={fieldClassName}
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-zinc-800">
              Nome del Responsabile del Servizio di Sant&apos;Egidio
            </span>
            <input
              required
              type="text"
              value={serviceDraft.managerName}
              onChange={(event) =>
              setServiceDraft((current) => ({
                  ...current,
                  managerName: event.target.value,
                }))
              }
              className={fieldClassName}
            />
          </label>

          {serviceModalError ? (
            <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {serviceModalError}
            </p>
          ) : null}
        </ModalShell>
      ) : null}
    </>
  );
}
