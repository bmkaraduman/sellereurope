import type { ReactNode } from "react";
import Link from "next/link";

export const metadata = { title: "SellerEurope" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0, background: "#f8fafc", color: "#0f172a" }}>
        <header style={{ background: "#1e293b", color: "#fff", padding: "12px 24px", display: "flex", gap: 20, alignItems: "center" }}>
          <strong>SellerEurope</strong>
          <Link href="/" style={{ color: "#cbd5e1" }}>Dashboard</Link>
          <Link href="/analyses" style={{ color: "#cbd5e1" }}>Analyses</Link>
          <Link href="/listings" style={{ color: "#cbd5e1" }}>Listings</Link>
          <Link href="/stores" style={{ color: "#cbd5e1" }}>Stores</Link>
        </header>
        <main style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>{children}</main>
      </body>
    </html>
  );
}
