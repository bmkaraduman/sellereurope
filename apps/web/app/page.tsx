import { api } from "@/lib/api";

export default async function Dashboard() {
  const [stores, analyses, listings] = await Promise.all([
    api<any[]>("/stores").catch(() => []),
    api<any[]>("/analyses?take=200").catch(() => []),
    api<any[]>("/listings").catch(() => []),
  ]);
  const count = (d: string) => analyses.filter((a) => a.decision === d).length;
  const Card = ({ label, value }: { label: string; value: number | string }) => (
    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: 16, minWidth: 160 }}>
      <div style={{ color: "#64748b", fontSize: 12 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700 }}>{value}</div>
    </div>
  );
  return (
    <>
      <h1>Dashboard</h1>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Card label="Stores" value={stores.length} />
        <Card label="Analysed (last 200)" value={analyses.length} />
        <Card label="LIST" value={count("LIST")} />
        <Card label="MANUAL_REVIEW" value={count("MANUAL_REVIEW")} />
        <Card label="SKIP" value={count("SKIP")} />
        <Card label="Active listings" value={listings.filter((l) => l.status === "ACTIVE").length} />
      </div>
      {stores.length === 0 && (
        <p style={{ marginTop: 24 }}>No stores yet. Create one under <b>Stores</b>, then paste its ID into the extension settings.</p>
      )}
    </>
  );
}
