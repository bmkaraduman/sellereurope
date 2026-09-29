import Link from "next/link";
import { api } from "@/lib/api";

export default async function Scans() {
  const scans = await api<any[]>("/scans").catch(() => []);
  return (
    <>
      <h1>Scans</h1>
      <p style={{ color: "#64748b", fontSize: 13 }}>Start a scan from the extension on any Amazon search, category or Bestseller page.</p>
      <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", fontSize: 13 }}>
        <thead><tr style={{ textAlign: "left", background: "#e2e8f0" }}>
          <th style={{ padding: 8 }}>Source</th><th>Store</th><th>Status</th><th>Progress</th><th>LIST</th><th>Started</th>
        </tr></thead>
        <tbody>
          {scans.map((s) => (
            <tr key={s.id} style={{ borderTop: "1px solid #e2e8f0" }}>
              <td style={{ padding: 8 }}><Link href={`/scans/${s.id}`}>{s.sourceMarketplace} · {s.sourceLabel || "(untitled)"}</Link></td>
              <td>{s.store.name} ({s.store.targetMarketplace})</td>
              <td>{s.status}{s.error ? ` · ${s.error}` : ""}</td>
              <td>{s.processed}/{s.total}</td>
              <td style={{ color: "#166534", fontWeight: 600 }}>{s.listCount}</td>
              <td>{new Date(s.createdAt).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
