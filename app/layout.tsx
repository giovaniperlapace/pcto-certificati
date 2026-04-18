import type { Metadata } from "next";
import { AppFooter } from "@/components/app-footer";
import "./globals.css";

export const metadata: Metadata = {
  title: "Certificati GXP",
  description: "MVP per la gestione e l'invio di certificati PCTO e volontariato.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it">
      <body
        suppressHydrationWarning
        className="min-h-screen bg-white pb-10 text-zinc-950 antialiased"
      >
        {children}
        <AppFooter />
      </body>
    </html>
  );
}
