import { api } from "@/lib/api";
import { revalidatePath } from "next/cache";

async function syncOrders() {
  "use server";
  await api("/orders/sync", { method: "POST", body: JSON.stringify({ days: 14 }) });
  revalidatePath("/orders");
}
async function markSourceOrdered(formData: FormData) {
  "use server";
  await api(`/orders/${formData.get("id")}/source-ordered`, { method: "POST", body: JSON.stringify({ sourceOrderId: String(formData.get("sourceOrderId")), sourceCost: Number(formData.get("sourceCost") || 0) }) });
  revalidatePath("/orders");
}
async function markReceived(formData: FormData) {
  "use server";
  await api(`/orders/${formData.get("id")}/received`, { method: "POST" });
  revalidatePath("/orders");
}
async function ship(formData: FormData) {
  "use server";
  await api(`/orders/${formData.get("id")}/ship`, { method: "POST", body: JSON.stringify({ carrier: String(formData.get("carrier")), trackingNumber: String(formData.get("trackingNumber")) }) });
  revalidatePath("/orders");
}

const STEP_COLOR: Record<string, string> = { NEW: "#991b1b", SOURCE_ORDERED: "#854d0e", AT_DEPOT: "#1d4ed8", SHIPPED: "#166534" };

export default async function Orders() {
  const rows = await api<any[]>("/orders").catch(() => []);
  return (
    <>
      <h1>Orders</h1>
      <form action={syncOrders}><button type="submit">Sync from Amazon (14 days)</button></form>
      <p style={{ color: "#64748b", fontSize: 13 }}>Pipeline: NEW → buy on source, ship to your depot → AT_DEPOT (repack, own label) → SHIPPED (tracking confirmed to Amazon).</p>
      <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", fontSize: 13 }}>
        <thead><tr style={{ textAlign: "left", background: "#e2e8f0" }}>
          <th style={{ padding: 8 }}>Amazon order</th><th>Market</th><th>Date</th><th>Total</th><th>Fulfilment</th><th>Action</th>
        </tr></thead>
        <tbody>
          {rows.map((o) => (
            <tr key={o.id} style={{ borderTop: "1px solid #e2e8f0" }}>
              <td style={{ padding: 8, fontFamily: "monospace" }}>{o.amazonOrderId}</td>
              <td>{o.marketplace}</td>
              <td>{new Date(o.purchaseDate).toLocaleDateString()}</td>
              <td>{o.total?.toFixed(2)} {o.currency}</td>
              <td style={{ color: STEP_COLOR[o.fulfillment], fontWeight: 600 }}>{o.fulfillment}{o.trackingNumber ? ` · ${o.carrier} ${o.trackingNumber}` : o.sourceOrderId ? ` · src ${o.sourceOrderId}` : ""}</td>
              <td>
                {o.fulfillment === "NEW" && (
                  <form action={markSourceOrdered} style={{ display: "flex", gap: 4 }}>
                    <input type="hidden" name="id" value={o.id} />
                    <input name="sourceOrderId" placeholder="Source order id" required />
                    <input name="sourceCost" type="number" step="0.01" placeholder="Cost" style={{ width: 70 }} />
                    <button type="submit">Ordered</button>
                  </form>
                )}
                {o.fulfillment === "SOURCE_ORDERED" && (
                  <form action={markReceived}><input type="hidden" name="id" value={o.id} /><button type="submit">Arrived at depot</button></form>
                )}
                {o.fulfillment === "AT_DEPOT" && (
                  <form action={ship} style={{ display: "flex", gap: 4 }}>
                    <input type="hidden" name="id" value={o.id} />
                    <input name="carrier" placeholder="DHL / DPD / GLS" required style={{ width: 90 }} />
                    <input name="trackingNumber" placeholder="Tracking no" required />
                    <button type="submit">Ship</button>
                  </form>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
