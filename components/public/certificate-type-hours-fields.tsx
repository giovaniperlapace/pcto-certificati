"use client";

import { useState } from "react";

type CertificateTypeHoursFieldsProps = {
  fieldClassName: string;
  fixedCertificateType?: "pcto" | "volontariato";
  hideCertificateType?: boolean;
};

export function CertificateTypeHoursFields({
  fieldClassName,
  fixedCertificateType,
  hideCertificateType = false,
}: CertificateTypeHoursFieldsProps) {
  const [certificateType, setCertificateType] = useState<"pcto" | "volontariato">(
    fixedCertificateType ?? "pcto",
  );
  const [showHoursError, setShowHoursError] = useState(false);

  const effectiveCertificateType = fixedCertificateType ?? certificateType;
  const shouldShowCertificateType = !hideCertificateType && !fixedCertificateType;
  const isPcto = effectiveCertificateType === "pcto";
  const hoursClassName = showHoursError
    ? `${fieldClassName} border-rose-400 focus:border-rose-500`
    : fieldClassName;

  return (
    <>
      {fixedCertificateType ? (
        <input type="hidden" name="certificate_type" value={fixedCertificateType} />
      ) : null}

      {shouldShowCertificateType ? (
        <label className="block space-y-2">
          <span className="text-sm font-medium text-zinc-800">Tipo certificato</span>
          <select
            required
            name="certificate_type"
            value={certificateType}
            onChange={(event) => {
              const nextValue = event.currentTarget.value as "pcto" | "volontariato";
              setCertificateType(nextValue);

              if (nextValue !== "pcto") {
                setShowHoursError(false);
              }
            }}
            className={fieldClassName}
          >
            <option value="pcto">PCTO</option>
            <option value="volontariato">Volontariato</option>
          </select>
        </label>
      ) : null}

      <label className="block space-y-2">
        <span className="text-sm font-medium text-zinc-800">
          Ore di servizio svolte
        </span>
        <input
          required={isPcto}
          type="number"
          min={1}
          step={1}
          name="hours_requested"
          inputMode="numeric"
          aria-invalid={showHoursError ? "true" : undefined}
          className={hoursClassName}
          onInvalid={() => {
            if (isPcto) {
              setShowHoursError(true);
            }
          }}
          onInput={(event) => {
            const hasValue = event.currentTarget.value.trim().length > 0;

            if (hasValue || !isPcto) {
              setShowHoursError(false);
            }
          }}
        />
        <p className="text-xs leading-5 text-zinc-500">
          Obbligatorio per PCTO, facoltativo per volontariato.
        </p>
        {showHoursError ? (
          <p className="text-xs font-medium text-rose-700">
            Inserisci il numero di ore per le richieste PCTO.
          </p>
        ) : null}
      </label>
    </>
  );
}
