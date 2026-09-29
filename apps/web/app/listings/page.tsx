import { api } from "@/lib/api";

export default async function Listings() {
  const rows = await api<any[]>("/listings").catch(() => []);
  return (
    <>
      <h1>Listings</h1>
      <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", fontSize: 13 }}>
        <thead><tr style={{ textAlign: "left", background: "#e2e8f0" }}>
          <th style={{ padding: 8 }}>SKU</th><th>ASIN</th><th>Title</th><th>Price</th><th>Qty</th><th>Status</th><th>Updated</th>
        </tr></thead>
        <tbody>
          {rows.map((l) => (
            <tr key={l.id} style={{ borderTop: "1px solid #e2e8f0" }}>
              <td style={{ padding: 8 }}>{l.sku}</td>
              <td>{l.asin}</td>
              <td style={{ maxWidth: 360, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.analysis?.sourceProduct?.title}</td>
              <td>{l.price.toFixed(2)}</td>
              <td>{l.quantity}</td>
              <td>{l.status}</td>
              <td>{new Date(l.updatedAt).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
