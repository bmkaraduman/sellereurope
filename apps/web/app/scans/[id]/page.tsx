import { api } from "@/lib/api";
import { revalidatePath } from "next/cache";
import { ScanTable } from "./table";

async function bulkList(formData: FormData) {
  "use server";
  const ids = formData.getAll("analysisId").map(String);
  const scanId = String(formData.get("scanId"));
  if (ids.length) await api("/listings/bulk", { method: "POST", body: JSON.stringify({ analysisIds: ids }) });
  revalidatePath(`/scans/${scanId}`);
}

export default async function ScanDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const scan = await api<any>(`/scans/${id}`);
  const running = scan.status === "PENDING" || scan.status === "RUNNING";
  return (
    <>
      {running && <meta httpEquiv="refresh" content="5" />}
      <h1>Scan · {scan.sourceMarketplace} → {scan.store.targetMarketplace}</h1>
      <p style={{ color: "#64748b", fontSize: 13 }}>
        {scan.sourceLabel} · {scan.status} · {scan.processed}/{scan.total} processed · <b style={{ color: "#166534" }}>{scan.listCount} listable</b>
        {running && " · refreshing every 5 s"}
        {scan.error && <span style={{ color: "#991b1b" }}> · {scan.error}</span>}
      </p>
      <form action={bulkList}>
        <input type="hidden" name="scanId" value={scan.id} />
        <ScanTable analyses={scan.analyses} />
      </form>
    </>
  );
}
