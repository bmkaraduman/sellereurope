import { api } from "@/lib/api";

export default async function Analyses() {
  const rows = await api<any[]>("/analyses?take=200").catch(() => []);
  const color: Record<string, string> = { LIST: "#166534", SKIP: "#991b1b", MANUAL_REVIEW: "#854d0e" };
  return (
    <>
      <h1>Analyses</h1>
      <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", fontSize: 13 }}>
        <thead><tr style={{ textAlign: "left", background: "#e2e8f0" }}>
          <th style={{ padding: 8 }}>ASIN</th><th>Source</th><th>Title</th><th>Src price</th><th>Sale price</th><th>Profit</th><th>Margin</th><th>Decision</th><th>Reasons</th>
        </tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} style={{ borderTop: "1px solid #e2e8f0" }}>
              <td style={{ padding: 8 }}><a href={r.sourceProduct.url} target="_blank">{r.sourceProduct.asin}</a></td>
              <td>{r.sourceProduct.sourceMarketplace}</td>
              <td style={{ maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.sourceProduct.title}</td>
              <td>{r.sourceProduct.price.toFixed(2)} {r.sourceProduct.currency}</td>
              <td>{r.salePrice?.toFixed(2) ?? "-"}</td>
              <td>{r.profit?.toFixed(2) ?? "-"}</td>
              <td>{r.marginPercent != null ? `${r.marginPercent}%` : "-"}</td>
              <td style={{ color: color[r.decision], fontWeight: 600 }}>{r.decision}</td>
              <td style={{ fontSize: 12, color: "#475569" }}>{r.reasons.join("; ")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
