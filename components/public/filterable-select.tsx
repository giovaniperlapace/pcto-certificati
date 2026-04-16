"use client";

import {
  useDeferredValue,
  useEffect,
  useRef,
  useState,
  type FocusEvent,
} from "react";
import { normalizeText } from "@/components/admin/admin-table-utils";

type FilterableSelectOption = {
  id: string;
  label: string;
  keywords?: string;
};

type FilterableSelectProps = {
  name: string;
  options: FilterableSelectOption[];
  placeholder: string;
  noResultsMessage: string;
  invalidSelectionMessage: string;
};

export function FilterableSelect({
  name,
  options,
  placeholder,
  noResultsMessage,
  invalidSelectionMessage,
}: FilterableSelectProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [selectedOptionId, setSelectedOptionId] = useState("");
  const deferredSearchValue = useDeferredValue(searchValue);
  const normalizedSearchValue = normalizeText(deferredSearchValue);

  const filteredOptions = normalizedSearchValue
    ? options.filter((option) => {
        const searchableText = normalizeText(
          `${option.label} ${option.keywords ?? ""}`,
        );

        return searchableText.includes(normalizedSearchValue);
      })
    : options;

  function handleInputBlur(event: FocusEvent<HTMLInputElement>) {
    const nextFocusedElement = event.relatedTarget as Node | null;

    if (nextFocusedElement && rootRef.current?.contains(nextFocusedElement)) {
      return;
    }

    setIsOpen(false);
  }

  function selectOption(option: FilterableSelectOption) {
    setSelectedOptionId(option.id);
    setSearchValue(option.label);
    setIsOpen(false);
  }

  useEffect(() => {
    const inputElement = inputRef.current;

    if (!inputElement) {
      return;
    }

    if (searchValue && !selectedOptionId) {
      inputElement.setCustomValidity(invalidSelectionMessage);
      return;
    }

    inputElement.setCustomValidity("");
  }, [invalidSelectionMessage, searchValue, selectedOptionId]);

  return (
    <div ref={rootRef} className="relative space-y-2">
      <input type="hidden" name={name} value={selectedOptionId} />

      <input
        ref={inputRef}
        required
        type="text"
        autoComplete="off"
        value={searchValue}
        onChange={(event) => {
          setSelectedOptionId("");
          setSearchValue(event.target.value);
          setIsOpen(true);
        }}
        onFocus={() => {
          setIsOpen(true);
        }}
        onBlur={handleInputBlur}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-950"
      />

      {isOpen ? (
        <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-1 shadow-lg">
          {filteredOptions.length > 0 ? (
            <ul className="space-y-1">
              {filteredOptions.map((option) => (
                <li key={option.id}>
                  <button
                    type="button"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      selectOption(option);
                    }}
                    className="w-full rounded-xl px-3 py-2 text-left text-sm text-zinc-700 transition hover:bg-zinc-100"
                  >
                    {option.label}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-3 py-2 text-xs text-zinc-500">{noResultsMessage}</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
