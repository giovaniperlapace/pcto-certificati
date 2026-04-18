import {
  APP_LAST_UPDATED_LABEL,
  APP_VERSION,
  SUPPORT_EMAIL,
} from "@/lib/app-info";

export function AppFooter() {
  return (
    <footer className="fixed inset-x-0 bottom-0 z-50 border-t border-zinc-200/80 bg-white/90 px-4 py-2 text-[11px] leading-4 text-zinc-500 shadow-sm backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <p className="min-w-0 truncate">
          Versione {APP_VERSION} - Ultima modifica: {APP_LAST_UPDATED_LABEL}
        </p>
        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          className="shrink-0 font-medium text-zinc-600 transition hover:text-zinc-950"
        >
          {SUPPORT_EMAIL}
        </a>
      </div>
    </footer>
  );
}
