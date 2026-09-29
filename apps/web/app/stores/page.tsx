import { api } from "@/lib/api";
import { revalidatePath } from "next/cache";
import { MARKETPLACES } from "@sellereurope/shared";

async function createStore(formData: FormData) {
  "use server";
  await api("/stores", {
    method: "POST",
    body: JSON.stringify({
      name: String(formData.get("name")),
      targetMarketplace: String(formData.get("targetMarketplace")),
      minProfit: Number(formData.get("minProfit")),
      minMarginPercent: Number(formData.get("minMarginPercent")),
      vatRegistered: formData.get("vatRegistered") === "on",
    }),
  });
  revalidatePath("/stores");
}

export default async function Stores() {
  const stores = await api<any[]>("/stores").catch(() => []);
  return (
    <>
      <h1>Stores</h1>
      <form action={createStore} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end", background: "#fff", padding: 16, borderRadius: 8, border: "1px solid #e2e8f0" }}>
        <label>Name<br /><input name="name" required /></label>
        <label>Target marketplace<br />
          <select name="targetMarketplace">
            {Object.values(MARKETPLACES).map((m) => <option key={m.code} value={m.code}>{m.code} · {m.domain}</option>)}
          </select>
        </label>
        <label>Min profit<br /><input name="minProfit" type="number" step="0.01" defaultValue={3} /></label>
        <label>Min margin %<br /><input name="minMarginPercent" type="number" step="0.1" defaultValue={15} /></label>
        <label><input name="vatRegistered" type="checkbox" /> VAT registered</label>
        <button type="submit">Create store</button>
      </form>
      <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", fontSize: 13, marginTop: 16 }}>
        <thead><tr style={{ textAlign: "left", background: "#e2e8f0" }}>
          <th style={{ padding: 8 }}>ID (paste into extension)</th><th>Name</th><th>Target</th><th>Min profit</th><th>Min margin</th><th>Price factor</th>
        </tr></thead>
        <tbody>
          {stores.map((s) => (
            <tr key={s.id} style={{ borderTop: "1px solid #e2e8f0" }}>
              <td style={{ padding: 8, fontFamily: "monospace" }}>{s.id}</td>
              <td>{s.name}</td><td>{s.targetMarketplace}</td><td>{s.minProfit}</td><td>{s.minMarginPercent}%</td><td>{s.priceFactor}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
