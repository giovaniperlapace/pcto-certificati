"use client";

import {
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
} from "react";
import { normalizeText } from "@/components/admin/admin-table-utils";

type CoordinatorOption = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
};

type CoordinatorSearchSelectProps = {
  coordinators: CoordinatorOption[];
};

export function CoordinatorSearchSelect({
  coordinators,
}: CoordinatorSearchSelectProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [searchValue, setSearchValue] = useState("");
  const [selectedCoordinatorId, setSelectedCoordinatorId] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const deferredSearchValue = useDeferredValue(searchValue);

  const coordinatorOptions = useMemo(
    () =>
      coordinators.map((coordinator) => ({
        ...coordinator,
        label: `${coordinator.last_name} ${coordinator.first_name} - ${coordinator.email}`,
      })),
    [coordinators],
  );

  const filteredCoordinators = useMemo(() => {
    if (!deferredSearchValue) {
      return coordinatorOptions;
    }

    const normalizedSearchValue = normalizeText(deferredSearchValue);

    return coordinatorOptions.filter((coordinator) =>
      normalizeText(coordinator.label).includes(normalizedSearchValue),
    );
  }, [coordinatorOptions, deferredSearchValue]);

  function handleInputBlur(event: FocusEvent<HTMLInputElement>) {
    const nextFocusedElement = event.relatedTarget as Node | null;

    if (nextFocusedElement && rootRef.current?.contains(nextFocusedElement)) {
      return;
    }

    setIsOpen(false);

    if (!selectedCoordinatorId) {
      setSearchValue("");
    }
  }

  function selectCoordinator(coordinator: (typeof coordinatorOptions)[number]) {
    setSelectedCoordinatorId(coordinator.id);
    setSearchValue(coordinator.label);
    setIsOpen(false);
  }

  useEffect(() => {
    const inputElement = inputRef.current;

    if (!inputElement) {
      return;
    }

    if (searchValue && !selectedCoordinatorId) {
      inputElement.setCustomValidity(
        "Seleziona un coordinatore dalla lista filtrata.",
      );
      return;
    }

    inputElement.setCustomValidity("");
  }, [searchValue, selectedCoordinatorId]);

  return (
    <div ref={rootRef} className="relative space-y-2">
      <input type="hidden" name="coordinator_id" value={selectedCoordinatorId} />

      <input
        ref={inputRef}
        type="text"
        required
        autoComplete="off"
        value={searchValue}
        onChange={(event) => {
          setSelectedCoordinatorId("");
          setSearchValue(event.target.value);
          setIsOpen(true);
        }}
        onFocus={() => {
          setIsOpen(true);
        }}
        onBlur={handleInputBlur}
        placeholder="Cerca per cognome, nome o email"
        className="w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm outline-none transition focus:border-zinc-950"
      />

      {isOpen ? (
        <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-1 shadow-lg">
          {filteredCoordinators.length > 0 ? (
            <ul className="space-y-1">
              {filteredCoordinators.map((coordinator) => (
                <li key={coordinator.id}>
                  <button
                    type="button"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      selectCoordinator(coordinator);
                    }}
                    className="w-full rounded-xl px-3 py-2 text-left text-sm text-zinc-700 transition hover:bg-zinc-100"
                  >
                    {coordinator.label}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-3 py-2 text-xs text-zinc-500">
              Nessun coordinatore trovato con questo filtro.
            </p>
          )}
        </div>
      ) : null}

      {deferredSearchValue && filteredCoordinators.length === 0 && !isOpen ? (
        <p className="text-xs text-zinc-500">
          Nessun coordinatore trovato con questo filtro.
        </p>
      ) : null}
    </div>
  );
}
