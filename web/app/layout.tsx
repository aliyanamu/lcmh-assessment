import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Low Carbon Materials Hub — Concrete EPD comparison",
  description:
    "Compare concrete products by embodied carbon across the life cycle, with provenance to every source EPD.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="site">
          <Link href="/" className="brand">
            Low Carbon Materials Hub
          </Link>
          <span className="tag">concrete EPDs · embodied carbon, with provenance to source</span>
        </header>
        {children}
      </body>
    </html>
  );
}
