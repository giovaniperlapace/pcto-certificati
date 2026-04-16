import Link from "next/link";
import { signOutAction } from "@/app/admin/actions";
import { requireCoordinator } from "@/lib/auth/admin";

const navigation = [{ href: "/coordinatore", label: "Dashboard" }];

export default async function CoordinatorLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { user, isAdmin } = await requireCoordinator("/coordinatore");

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">
              Certificati GXP
            </p>
            <h1 className="text-xl font-semibold tracking-tight text-zinc-950">
              Area coordinatore
            </h1>
          </div>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <nav className="flex flex-wrap gap-2">
              {navigation.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:border-zinc-950 hover:text-zinc-950"
                >
                  {item.label}
                </Link>
              ))}
              {isAdmin ? (
                <Link
                  href="/admin"
                  className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:border-zinc-950 hover:text-zinc-950"
                >
                  Area admin
                </Link>
              ) : null}
            </nav>

            <div className="flex items-center gap-3">
              <span className="text-sm text-zinc-600">{user.email}</span>
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:border-zinc-950 hover:text-zinc-950"
                >
                  Esci
                </button>
              </form>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10">{children}</main>
    </div>
  );
}
